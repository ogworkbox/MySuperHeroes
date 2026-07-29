// app/login/page.tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const fakeEmail = `${username.toLowerCase().trim()}@student.org`;

    if (isSignUp) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: password,
      });

      if (authError) return setMessage(`Error: ${authError.message}`);

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          username: username.trim(),
          nickname: username.trim(),
          tier: 'Bronze',
          status: 'Pending'
        });

        if (profileError) return setMessage(`Profile Error: ${profileError.message}`);
        setMessage('Sign up successful! Ask your teacher/admin to approve your account.');
      }
    } else {
      await supabase.auth.signOut();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password,
      });

      if (authError || !authData.user) {
        return setMessage('Invalid username or password.');
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();
        return setMessage(`DB Read Error: ${profileError.message}`);
      }

      if (!profile || profile.status !== 'Approved') {
        await supabase.auth.signOut();
        return setMessage(`Status is "${profile?.status || 'Unknown'}". Waiting for admin approval.`);
      }

      router.push('/dashboard');
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900 text-slate-100">
      {/* App Branding */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold text-amber-400 tracking-tight">🦸‍♂️ My SuperHeroes</h1>
        <p className="text-slate-400 text-sm mt-1">The Ultimate Heroic Collection & Trading Adventure</p>
      </div>

      {/* Parent Safety Trust Banner */}
      <div className="w-full max-w-xl bg-emerald-950/60 border border-emerald-600/50 rounded-2xl p-5 mb-6 shadow-xl text-left">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-emerald-500 text-slate-950 font-extrabold text-xs px-2 py-0.5 rounded-full uppercase">100% Kid-Safe Zone</span>
          <h3 className="text-emerald-300 font-bold text-sm">Parent-First Protection Guarantee</h3>
        </div>
        <p className="text-emerald-100/80 text-xs mb-3">
          My SuperHeroes is engineered from the ground up to ensure complete safety and privacy. We will never collect or store any personal data, photos or contact details. Here is how we protect your child:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-emerald-200 font-medium mb-3">
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>🛡️</span> Zero Personal Data
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>💬</span> No Chat or Comms
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>👥</span> No P2P Contact
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>🏠</span> No Addresses
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>📧</span> No Emails / Phones
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>📸</span> No Photo Sharing
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>🔒</span> Closed Ecosystem
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>👨‍🏫</span> Admin Approval
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-900/40 p-2 rounded-lg border border-emerald-800/50">
            <span>🚫</span> Zero External Ads
          </div>
        </div>
        <div className="bg-emerald-900/60 border border-emerald-500/40 rounded-xl p-2.5 text-center text-xs text-emerald-300 font-semibold">
          🏫 Owned, Administered and Created by an NWPS student for NWPS Students only.
        </div>
      </div>

      {/* Auth Form Card */}
      <form onSubmit={handleAuth} className="bg-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-amber-400">
          {isSignUp ? 'Create Hero Account' : 'Hero Log In'}
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">Secret Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-amber-400 text-white" placeholder="Choose a safe superhero name" />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-1">Secret Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 focus:outline-none focus:border-amber-400 text-white" placeholder="••••••••" />
        </div>

        {message && <p className="mb-4 text-center text-sm font-medium text-amber-300 bg-amber-950/40 p-3 rounded-lg">{message}</p>}

        <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold p-3 rounded-lg text-lg transition-colors">
          {isSignUp ? 'Request Hero Access' : 'Enter Headquarters'}
        </button>

        <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-slate-400 mt-4 text-sm hover:text-white underline">
          {isSignUp ? 'Already have a hero identity? Log in' : 'New hero? Register a secret codename'}
        </button>
      </form>
    </main>
  );
}