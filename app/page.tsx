// app/page.tsx
'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-900 text-slate-100 text-center">
      <div className="max-w-xl bg-slate-800 border border-slate-700 p-10 rounded-3xl shadow-2xl">
        <div className="text-5xl mb-4">🦸‍♂️</div>
        <h1 className="text-4xl font-extrabold text-amber-400 tracking-tight mb-3">
          My SuperHeroes
        </h1>
        <p className="text-slate-300 text-base mb-8 leading-relaxed">
          The ultimate safe trading and collection adventure. Create epic heroes, unlock legendary tiers, and connect securely with your schoolmates!
        </p>

        <button
          onClick={() => router.push('/login')}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold p-4 rounded-xl text-lg transition-all shadow-lg transform hover:-translate-y-0.5"
        >
          Enter Headquarters 🚀
        </button>

        <div className="mt-6 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/50 p-3 rounded-xl">
          🏫 100% Kid-Safe Zone • Created by an NWPS student for NWPS Students only.
        </div>
      </div>
    </main>
  );
}