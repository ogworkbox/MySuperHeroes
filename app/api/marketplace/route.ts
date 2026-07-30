import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch active marketplace listings
export async function GET() {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select(`
      *,
      cards (*)
    `)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, listings: data });
}

// POST: Handle listing creation, trade offers, accepting, and declining
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, listingId, buyerId, offeredCardIds, offerId } = body;

    // 1. Submit a trade offer
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

      // Insert the offered cards into trade items table if you have one
      if (offeredCardIds && offeredCardIds.length > 0) {
        const itemsToInsert = offeredCardIds.map((cardId: string) => ({
          trade_offer_id: offerData.id,
          card_id: cardId
        }));

        await supabase.from('trade_offer_items').insert(itemsToInsert);
      }

      return NextResponse.json({ success: true });
    }

    // 2. Decline a trade offer
    if (action === 'decline_offer') {
      const { error } = await supabase
        .from('trade_offers')
        .update({ status: 'declined' })
        .eq('id', offerId);

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    // 3. Accept a trade offer (Swaps card owners and closes the listing)
    if (action === 'accept_offer') {
      // Fetch the offer and related listing info
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

      const sellerId = offer.listings.seller_id;
      const buyerId = offer.buyer_id;
      const listedCardId = offer.listings.card_id;

      // Fetch the cards being offered by the buyer
      const { data: offeredItems } = await supabase
        .from('trade_offer_items')
        .select('card_id')
        .eq('trade_offer_id', offerId);

      // Swap the listed card to the buyer
      await supabase
        .from('cards')
        .update({ user_id: buyerId })
        .eq('id', listedCardId);

      // Swap the offered cards to the seller
      if (offeredItems && offeredItems.length > 0) {
        for (const item of offeredItems) {
          await supabase
            .from('cards')
            .update({ user_id: sellerId })
            .eq('id', item.card_id);
        }
      }

      // Mark trade offer as accepted
      await supabase
        .from('trade_offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      // Close/complete the marketplace listing
      await supabase
        .from('marketplace_listings')
        .update({ status: 'completed' })
        .eq('id', offer.listings.id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action specified.' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}