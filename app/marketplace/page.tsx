'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<'browse' | 'inbox'>('browse');
  const [listings, setListings] = useState<any[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<any[]>([]);
  const [myCards, setMyCards] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [selectedCardsToOffer, setSelectedCardsToOffer] = useState<string[]>([]);
  
  // Inline notification message state instead of pop-ups
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000); // Hide after 4 seconds
  };

  useEffect(() => {
    async function initMarketplace() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchMyCards(user.id);
        fetchIncomingOffers(user.id);
      }
      fetchListings();
    }
    initMarketplace();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/marketplace');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.listings)) {
        setListings(data.listings);
      } else {
        setListings([]);
      }
    } catch (err) {
      console.error('Failed to fetch listings', err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCards = async (currentUserId: string) => {
    const { data } = await supabase.from('cards').select('*').eq('user_id', currentUserId);
    setMyCards(data || []);
  };

  const fetchIncomingOffers = async (currentUserId: string) => {
    const { data, error } = await supabase
      .from('trade_offers')
      .select(`
        *,
        listings:listing_id (
          *,
          cards (*)
        )
      `)
      .eq('listings.seller_id', currentUserId)
      .eq('status', 'pending');

    if (!error && data) {
      setIncomingOffers(data);
    }
  };

  const toggleCardSelection = (cardId: string) => {
    if (selectedCardsToOffer.includes(cardId)) {
      setSelectedCardsToOffer(selectedCardsToOffer.filter(id => id !== cardId));
    } else {
      setSelectedCardsToOffer([...selectedCardsToOffer, cardId]);
    }
  };

  const submitTradeOffer = async () => {
    if (selectedCardsToOffer.length === 0) {
      showMessage('Please select at least one card to offer in trade.', 'error');
      return;
    }

    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'offer',
        listingId: selectedListing.id,
        buyerId: userId,
        offeredCardIds: selectedCardsToOffer
      })
    });

    const data = await res.json();
    if (data.success) {
      showMessage('Trade offer sent successfully! 🤝', 'success');
      setSelectedListing(null);
      setSelectedCardsToOffer([]);
    } else {
      showMessage('Error: ' + data.error, 'error');
    }
  };

  const handleTradeAction = async (offerId: string, actionType: 'accept_offer' | 'decline_offer') => {
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: actionType,
        offerId: offerId
      })
    });

    const data = await res.json();
    if (data.success) {
      showMessage(actionType === 'accept_offer' ? 'Trade accepted successfully! 🎉' : 'Trade offer declined.', 'success');
      fetchIncomingOffers(userId);
      fetchListings();
    } else {
      showMessage('Error: ' + data.error, 'error');
    }
  };

  const handleUnlist = async (listingId: string) => {
    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'unlist',
        listingId: listingId
      })
    });

    const data = await res.json();
    if (data.success) {
      showMessage('Listing removed successfully! 🗑️', 'success');
      fetchListings();
    } else {
      showMessage('Error: ' + data.error, 'error');
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 bg-slate-900 text-slate-100 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Student Card Marketplace 🏪</h1>
          <p className="text-purple-400 font-semibold">Trade cards safely with your classmates</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 flex">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'browse' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Browse 🌐
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition relative ${activeTab === 'inbox' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Trade Inbox 📥
              {incomingOffers.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-xs px-1.5 py-0.5 rounded-full font-extrabold">
                  {incomingOffers.length}
                </span>
              )}
            </button>
          </div>
          <Link href="/dashboard" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Back to Binder 🎒
          </Link>
        </div>
      </header>

      {/* Inline Notification Banner */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl border font-medium text-sm flex items-center justify-between ${notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' : 'bg-red-950/80 border-red-500/50 text-red-300'}`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-75 hover:opacity-100 font-bold ml-4">✕</button>
        </div>
      )}

      {activeTab === 'browse' ? (
        loading ? (
          <p className="text-center text-slate-400 py-12">Loading marketplace listings...</p>
        ) : listings.length === 0 ? (
          <div className="text-center p-12 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400">
            No cards currently listed for trade in the marketplace. Go to your dashboard and list one!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {listings.map((item) => (
              <div key={item.id} className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="w-full aspect-square bg-slate-950 rounded-xl mb-4 overflow-hidden border border-slate-700">
                    {item.cards?.image_url ? (
                      <img src={item.cards.image_url} alt={item.cards.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">No Image</div>
                    )}
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest bg-slate-900 px-2.5 py-1 rounded text-amber-400">
                      {item.cards?.rarity || 'Common'}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">{item.cards?.element || 'Unknown'}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white truncate mb-2">{item.cards?.name || 'Unnamed Card'}</h3>
                  <p className="text-xs text-slate-400 mb-4">Seller ID: {item.seller_id?.slice(0, 8)}...</p>
                </div>

                {item.seller_id === userId ? (
                  <button 
                    onClick={() => handleUnlist(item.id)}
                    className="w-full bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 py-2.5 rounded-xl font-bold transition shadow-md"
                  >
                    Remove Listing 🗑️
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedListing(item)}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl font-bold transition shadow-md"
                  >
                    Propose Trade 🤝
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-amber-400 mb-4">Pending Trade Offers on Your Cards</h2>
          {incomingOffers.length === 0 ? (
            <div className="text-center p-12 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400">
              No pending trade offers right now.
            </div>
          ) : (
            incomingOffers.map((offer) => (
              <div key={offer.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Offer on your card: <span className="text-amber-400">{offer.listings?.cards?.name}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Status: Pending your response</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <button
                    onClick={() => handleTradeAction(offer.id, 'accept_offer')}
                    className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition shadow"
                  >
                    Accept ✅
                  </button>
                  <button
                    onClick={() => handleTradeAction(offer.id, 'decline_offer')}
                    className="flex-1 md:flex-none bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 font-bold px-4 py-2 rounded-xl text-sm transition"
                  >
                    Decline ❌
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Trade Offer Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 max-w-lg w-full p-6 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-amber-400 mb-2">Offer Trade for {selectedListing.cards?.name}</h2>
            <p className="text-sm text-slate-300 mb-4">Select one or more cards from your binder to offer in exchange:</p>

            {myCards.length === 0 ? (
              <p className="text-red-400 text-sm mb-4">You have no cards in your binder to trade!</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6 max-h-60 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-700">
                {myCards.map((card) => {
                  const isSelected = selectedCardsToOffer.includes(card.id);
                  return (
                    <div 
                      key={card.id} 
                      onClick={() => toggleCardSelection(card.id)}
                      className={`cursor-pointer p-2 rounded-xl border-2 transition flex items-center gap-3 ${isSelected ? 'border-amber-400 bg-amber-500/10' : 'border-slate-700 bg-slate-800'}`}
                    >
                      <img src={card.image_url} alt={card.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{card.name}</p>
                        <p className="text-xs text-amber-400">{card.rarity}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={submitTradeOffer}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl transition"
              >
                Send Offer 🚀
              </button>
              <button 
                onClick={() => { setSelectedListing(null); setSelectedCardsToOffer([]); }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
