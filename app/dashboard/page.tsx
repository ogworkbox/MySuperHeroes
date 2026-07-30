// app/dashboard/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myCards, setMyCards] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch user profile (getting nickname, tier, and role)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile);

      // 2. If it's the admin teacher, fetch all student accounts
      if (profile?.role === 'admin') {
        const { data: students } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'admin') // Don't list yourself
          .order('nickname', { ascending: true });
        setAllStudents(students || []);
      } else {
        // 3. If it's a student, fetch only their own card deck collection (using user_id instead of owner_id)
        const { data: cards } = await supabase.from('cards').select('*').eq('user_id', user.id);
        setMyCards(cards || []);
      }
      setLoading(false);
    }
    fetchDashboardData();
  }, []);

  // Helper function for Admin to update student tiers/access
  const updateStudentTier = async (studentId: string, newTier: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ tier: newTier })
      .eq('id', studentId);
    
    if (!error) {
      setAllStudents(allStudents.map(s => s.id === studentId ? { ...s, tier: newTier } : s));
    }
  };

  // Helper function for Admin to completely remove a student account
  const removeStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to remove this student? All their cards will be deleted.")) return;
    
    const { error } = await supabase.from('profiles').delete().eq('id', studentId);
    if (!error) {
      setAllStudents(allStudents.filter(s => s.id !== studentId));
    }
  };

  // Helper function to list a card on the marketplace
  const handleListCard = async (cardId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch('/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', cardId, userId: user.id }),
    });
    const data = await res.json();
    if (data.success) {
      alert('Card successfully listed on the marketplace! 🏪');
    } else {
      alert('Error: ' + data.error);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading portal...</div>;
  }

  // ==================== TEACHER / ADMIN PANEL GRAPHICS ====================
  if (userProfile?.role === 'admin') {
    return (
      <main className="max-w-6xl mx-auto p-6 bg-slate-900 text-slate-100 min-h-screen">
        <header className="flex justify-between items-center mb-10 bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div>
            <h1 className="text-3xl font-bold text-white">Teacher Command Center</h1>
            <p className="text-emerald-400 font-semibold tracking-wide">Logged in as: {userProfile?.nickname}</p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
            Log Out
          </button>
        </header>

        <h2 className="text-2xl font-bold text-slate-300 mb-6">Manage Classroom Portals ({allStudents.length} Students)</h2>
        
        {allStudents.length === 0 ? (
          <div className="text-center p-12 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400">
            No students have created an account yet.
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-700 text-sm font-bold">
                  <th className="p-4">Student Username</th>
                  <th className="p-4">Current Access Tier</th>
                  <th className="p-4">Token Balance</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {allStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-750 transition-colors">
                    <td className="p-4 font-bold text-white">{student.nickname}</td>
                    <td className="p-4">
                      <select 
                        value={student.tier || 'Bronze'} 
                        onChange={(e) => updateStudentTier(student.id, e.target.value)}
                        className="bg-slate-900 text-amber-400 font-semibold border border-slate-700 rounded-lg p-1.5 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Bronze">Bronze Tier</option>
                        <option value="Silver">Silver Tier</option>
                        <option value="Gold">Gold Tier</option>
                        <option value="Platinum">Platinum Tier</option>
                      </select>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{student.tokens || 0} pts</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => removeStudent(student.id)}
                        className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      >
                        Remove Student
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    );
  }

  // ==================== REGULAR STUDENT VIEW ====================
  return (
    <main className="max-w-6xl mx-auto p-6 bg-slate-900 text-slate-100 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 bg-slate-800 p-6 rounded-2xl border border-slate-700 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Binder: {userProfile?.nickname || 'Loading...'}</h1>
          <p className="text-amber-400 font-semibold tracking-wide">Rank Tier: {userProfile?.tier || 'Bronze'}</p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <Link href="/create" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-2.5 rounded-xl font-bold transition-colors">
            ＋ Forge New Card
          </Link>
          <Link href="/marketplace" className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold transition-colors">
            🏪 Marketplace
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors">
            Log Out
          </button>
        </div>
      </header>

      <h2 className="text-2xl font-bold text-slate-300 mb-6">Your Deck Collection ({myCards.length})</h2>
      {myCards.length === 0 ? (
        <div className="text-center p-12 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400">
          No cards inside your binder yet. Go create your very first custom character!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {myCards.map((card) => (
            <div key={card.id} className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 shadow-xl flex flex-col justify-between transform hover:-translate-y-1 transition-transform">
              <div>
                <div className="w-full aspect-square bg-slate-950 rounded-xl mb-4 overflow-hidden border border-slate-700">
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Generating Image...</div>
                  )}
                </div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest bg-slate-900 px-2.5 py-1 rounded text-amber-400">
                    {card.rarity}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">{card.element}</span>
                </div>
                <h3 className="text-xl font-extrabold text-white truncate mb-4">{card.name}</h3>
                
                <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl text-sm mb-4">
                  <div className="flex justify-between"><span>⚔️ Power:</span> <span className="font-bold text-red-400">{card.power}</span></div>
                  <div className="flex justify-between"><span>⚡ Speed:</span> <span className="font-bold text-sky-400">{card.speed}</span></div>
                  <div className="flex justify-between"><span>🛡️ Defense:</span> <span className="font-bold text-emerald-400">{card.defense}</span></div>
                  <div className="flex justify-between"><span>🔮 Magic:</span> <span className="font-bold text-violet-400">{card.magic}</span></div>
                </div>
              </div>
              
              <div className="border-t border-slate-700/60 pt-3 flex flex-col gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-tight">Special Move: {card.move_name}</p>
                  <p className="text-xs text-slate-400 italic line-clamp-2 mt-0.5">"{card.move_desc}"</p>
                </div>

                <button
                  onClick={() => handleListCard(card.id)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-lg font-bold transition shadow-md"
                >
                  List for Trade 🏷️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}