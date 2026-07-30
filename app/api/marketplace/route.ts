import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic'; // Forces Next.js to fetch fresh data every time

// GET: Fetch active marketplace listings and pending trade offers with all associated cards
export async function GET() {
  // 1. Fetch active marketplace listings with their cards
  const { data: listings, error: listingError } = await supabase
    .from('marketplace_listings')
    .select(`
      *,
      cards (*)
    `)
    .eq('status', 'active');

  if (listingError) {
    return NextResponse.json({ success: false, error: listingError.message }, { status: 400 });
  }

  // 2. Fetch pending trade offers with the listing info, target card, and offered items
  const { data: offers, error: offerError } = await supabase
    .from('trade_offers')
    .select(`
      *,
      marketplace_listings (
        *,
        cards (*)
      ),
      trade_offer_items (
        cards (*)
      )
    `)
    .eq('status', 'pending');

  if (offerError) {
    return NextResponse.json({ success: false, error: offerError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, listings, offers });
}

// POST: Handle listing creation, unlisting, trade offers, accepting, and declining
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, cardId, sellerId, listingId, buyerId, offeredCardIds, offerId } = body;

    // 1. List a card for trade (with duplicate check)
    if (action === 'list') {
      const sId = sellerId || body.userId;

      // Check if this card is already actively listed
      const { data: existingListing } = await supabase
        .from('marketplace_listings')
        .select('id')
        .eq('card_id', cardId)
        .eq('status', 'active')
        .single();

      if (existingListing) {
        return NextResponse.json({ success: false, error: 'This card is already listed in the marketplace.' }, { status: 400 });
      }

      const { error } = await supabase
        .from('marketplace_listings')
        .insert({
          card_id: cardId,
          seller_id: sId,
          status: 'active'
        });

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // 1b. Remove/Cancel an active listing
    if (action === 'unlist') {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({ status: 'cancelled' })
        .eq('id', listingId);

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // 2. Submit a trade offer
    if (action === 'offer') {
      const { data: offerData, error: offerError } = await supabase
        .from('trade_offers')
        .insert({
          listing_id: listingId,
          buyer_id: buyerId,
          status: 'pending'
        })
        .select()
        .single();

      if (offerError) return NextResponse.json({ success: false, error: offerError.message }, { status: 400 });

      if (offeredCardIds && offeredCardIds.length > 0) {
        const itemsToInsert = offeredCardIds.map((cId: string) => ({
          trade_offer_id: offerData.id,
          card_id: cId
        }));
        await supabase.from('trade_offer_items').insert(itemsToInsert);
      }

      return NextResponse.json({ success: true });
    }

    // 3. Decline a trade offer
    if (action === 'decline_offer') {
      const { error } = await supabase
        .from('trade_offers')
        .update({ status: 'declined' })
        .eq('id', offerId);

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // 4. Accept a trade offer
    if (action === 'accept_offer') {
      const { data: offer, error: fetchError } = await supabase
        .from('trade_offers')
        .select(`
          *,
          marketplace_listings:listing_id (
            id,
            seller_id,
            card_id
          )
        `)
        .eq('id', offerId)
        .single();

      // Fallback check if alias maps differently depending on schema relations
      const listingData = offer?.marketplace_listings || (offer as any)?.listings;

      if (fetchError || !offer || !listingData) {
        return NextResponse.json({ success: false, error: 'Trade offer or associated listing not found.' }, { status: 400 });
      }

      const sId = listingData.seller_id;
      const bId = offer.buyer_id;
      const listedCardId = listingData.card_id;

      const { data: offeredItems } = await supabase
        .from('trade_offer_items')
        .select('card_id')
        .eq('trade_offer_id', offerId);

      // Swap listed card ownership to the buyer
      const { error: listedCardError } = await supabase
        .from('cards')
        .update({ user_id: bId })
        .eq('id', listedCardId);

      if (listedCardError) {
        return NextResponse.json({ success: false, error: `Failed to transfer listed card: ${listedCardError.message}` }, { status: 400 });
      }

      // Swap offered cards ownership to the seller
      if (offeredItems && offeredItems.length > 0) {
        for (const item of offeredItems) {
          const { error: offeredCardError } = await supabase
            .from('cards')
            .update({ user_id: sId })
            .eq('id', item.card_id);

          if (offeredCardError) {
            return NextResponse.json({ success: false, error: `Failed to transfer offered card: ${offeredCardError.message}` }, { status: 400 });
          }
        }
      }

      // Update trade offer status to accepted
      await supabase.from('trade_offers').update({ status: 'accepted' }).eq('id', offerId);
      
      // Update marketplace listing status to completed
      await supabase.from('marketplace_listings').update({ status: 'completed' }).eq('id', listingData.id);

      return NextResponse.json({ success: true, message: 'Trade successfully accepted and cards transferred!' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified.' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
