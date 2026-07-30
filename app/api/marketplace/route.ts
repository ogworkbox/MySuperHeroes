import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch active marketplace listings safely using the 'username' column
export async function GET() {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(`
      *,
      cards (*),
      profiles:seller_id (username)
    `)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, listings: data });
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
          listings:listing_id (
            id,
            seller_id,
            card_id
          )
        `)
        .eq('id', offerId)
        .single();

      if (fetchError || !offer) {
        return NextResponse.json({ success: false, error: 'Trade offer not found.' }, { status: 400 });
      }

      const sId = offer.listings.seller_id;
      const bId = offer.buyer_id;
      const listedCardId = offer.listings.card_id;

      const { data: offeredItems } = await supabase
        .from('trade_offer_items')
        .select('card_id')
        .eq('trade_offer_id', offerId);

      // Swap listed card to buyer
      await supabase.from('cards').update({ user_id: bId }).eq('id', listedCardId);

      // Swap offered cards to seller
      if (offeredItems && offeredItems.length > 0) {
        for (const item of offeredItems) {
          await supabase.from('cards').update({ user_id: sId }).eq('id', item.card_id);
        }
      }

      await supabase.from('trade_offers').update({ status: 'accepted' }).eq('id', offerId);
      await supabase.from('marketplace_listings').update({ status: 'completed' }).eq('id', offer.listings.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified.' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
