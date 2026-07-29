// app/admin/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [tradeLogs, setTradeLogs] = useState<any[]>([]);

  useEffect(() => {
    async function checkAdminAndFetch() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single();

      // Crucial: Update 'AdminTeacher' to whatever username you use to register your own account!
      if (profile?.username !== 'AdminTeacher') {
        return alert('Access Denied: Admin Rights Required.');
      }
      setIsAdmin(true);

      const { data: pending } = await supabase.from('profiles').select('*').eq('status', 'Pending');
      setPendingUsers(pending || []);

      const { data: approved } = await supabase.from('profiles').select('*').eq('status', 'Approved');
      setAllUsers(approved || []);

      const { data: trades } = await supabase.from('trades').select('*').order('created_at', { ascending: false });
      setTradeLogs(trades || []);
    }
    checkAdminAndFetch();
  }, []);

  const approveUser = async (id: string) => {
    await supabase.from('profiles').update({ status: 'Approved' }).eq('id', id);
    alert('User approved!');
    window.location.reload();
  };

  const updateTier = async (id: string, newTier: string) => {
    await supabase.from('profiles').update({ tier: newTier }).eq('id', id);
    alert(`Student tier changed to ${newTier}!`);
  };

  const undoTrade = async (log: any) => {
    await supabase.from('cards').update({ owner_id: log.sender_id }).in('id', log.requested_card_ids);
    await supabase.from('cards').update({ owner_id: log.receiver_id }).in('id', log.offered_card_ids);
    await supabase.from('trades').update({ status: 'Undone' }).eq('id', log.id);
    alert('Trade completely undone! Inventories restored.');
    window.location.reload();
  };

  if (!isAdmin) return <p className="p-8 text-center text-red-400">Verifying security parameters...</p>;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-10 bg-slate-900 text-slate-100 min-h-screen">
      <h1 className="text-4xl font-extrabold text-red-500 border-b border-red-900/40 pb-4">🛡️ System Administration Desk</h1>

      {/* Approve Section */}
      <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold mb-4 text-amber-400">Waiting Approvals ({pendingUsers.length})</h2>
        {pendingUsers.length === 0 ? <p className="text-sm text-slate-400">No students waiting.</p> : (
          <div className="space-y-3">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-lg">
                <span className="font-bold text-white">{u.username}</span>
                <button onClick={() => approveUser(u.id)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-1.5 rounded-md font-bold text-sm">Approve Entry</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tier Allocation Section */}
      <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold mb-4 text-emerald-400">Manage Student Access Tiers</h2>
        <div className="space-y-3">
          {allUsers.map(u => (
            <div key={u.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-lg">
              <span className="font-bold">{u.username} (Current: {u.tier})</span>
              <select defaultValue={u.tier} onChange={(e) => updateTier(u.id, e.target.value)} className="bg-slate-800 border border-slate-700 p-1.5 rounded text-white text-sm">
                <option value="Bronze">Bronze (250 pts)</option>
                <option value="Silver">Silver (500 pts)</option>
                <option value="Gold">Gold (1000 pts)</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Trade History Ledger */}
      <section className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold mb-4 text-sky-400">Live Trade History Audit</h2>
        <div className="space-y-3">
          {tradeLogs.length === 0 ? <p className="text-sm text-slate-400">No trades recorded yet.</p> : tradeLogs.map(log => (
            <div key={log.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-lg text-sm border-l-4 border-slate-600">
              <div>
                <p><span className="text-slate-400">From User ID:</span> {log.sender_id} ➔ <span className="text-slate-400">To:</span> {log.receiver_id}</p>
                <p className="text-xs text-slate-500 mt-1">Status: <span className="uppercase text-white font-mono">{log.status}</span></p>
              </div>
              {log.status !== 'Undone' && (
                <button onClick={() => undoTrade(log)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-medium text-xs">Undo Trade</button>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}