// app/create/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function CreateCard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [archetype, setArchetype] = useState('Superhero');
  const [element, setElement] = useState('Fire');
  const [rarity, setRarity] = useState('Common');
  const [power, setPower] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [defense, setDefense] = useState(0);
  const [magic, setMagic] = useState(0);
  const [moveName, setMoveName] = useState('');
  const [moveDesc, setMoveDesc] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      
      if (data.tier === 'Bronze') {
        setPower(70); setSpeed(60); setDefense(60); setMagic(60);
      }
    }
    getProfile();
  }, [router]);

  const getMaxPoints = () => {
    if (profile?.tier === 'Bronze') return 250;
    if (profile?.tier === 'Silver') return 500;
    return 1000;
  };

  const currentTotal = Number(power) + Number(speed) + Number(defense) + Number(magic);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (currentTotal > getMaxPoints()) {
      setLoading(false);
      return setError(`You used ${currentTotal} points, but your tier limit is ${getMaxPoints()}!`);
    }

    const { data: { user } } = await supabase.auth.getUser();

    // Trigger our secret backend API that runs DALL-E 3 and saves the card
    const res = await fetch('/api/create-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        name,
        archetype,
        element,
        rarity,
        power,
        speed,
        defense,
        magic,
        moveName,
        moveDesc
      })
    });

    const result = await res.json();
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Something went wrong creating the AI art.');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-6 bg-slate-900 min-h-screen text-slate-100">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
        <h1 className="text-3xl font-extrabold text-amber-400 mb-2">Forge Custom Card</h1>
        <p className="text-sm text-slate-400 mb-6">Your access level: <span className="text-white font-bold">{profile?.tier} Tier</span> (Max: {getMaxPoints()} pts)</p>

        {error && <p className="mb-4 text-red-400 bg-red-950/40 p-3 rounded-lg text-sm">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Character Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white" placeholder="Name..." />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Style Style</label>
            <select value={archetype} onChange={(e) => setArchetype(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white">
              <option>Superhero (Marvel/X-Men style)</option>
              <option>Fashion Doll (Barbie style)</option>
              <option>Mythical Dragon</option>
              <option>Futuristic Robot</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Element</label>
            <select value={element} onChange={(e) => setElement(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white">
              <option>Fire</option><option>Water</option><option>Earth</option>
              <option>Air</option><option>Electric</option><option>Ice</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-slate-300 mb-1">Rarity</label>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white">
            <option>Common</option>
            <option>Mid</option>
            {profile?.tier !== 'Bronze' && <option>Rare</option>}
            {profile?.tier === 'Gold' && <><option>Epic</option><option>Legendary</option></>}
          </select>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-xl mb-6 border border-slate-700/50">
          <div className="flex justify-between font-bold mb-4">
            <span>Stat Point Distribution</span>
            <span className={currentTotal > getMaxPoints() ? 'text-red-400' : 'text-emerald-400'}>
              {currentTotal} / {getMaxPoints()} pts
            </span>
          </div>

          {['Power', 'Speed', 'Defense', 'Magic'].map((stat) => {
            const val = stat === 'Power' ? power : stat === 'Speed' ? speed : stat === 'Defense' ? defense : magic;
            const setVal = stat === 'Power' ? setPower : stat === 'Speed' ? setSpeed : stat === 'Defense' ? setDefense : setMagic;
            
            return (
              <div key={stat} className="mb-3">
                <div className="flex justify-between text-xs mb-1 text-slate-400">
                  <span>{stat}</span>
                  <span className="font-bold text-white">{val}</span>
                </div>
                <input type="range" min="0" max={getMaxPoints()} disabled={profile?.tier === 'Bronze'} value={val} onChange={(e) => setVal(Number(e.target.value))} className="w-full accent-amber-400" />
              </div>
            );
          })}
        </div>

        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-700/50 mb-6">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3">Special Ability</h3>
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">Ability Move Name</label>
            <input type="text" required value={moveName} onChange={(e) => setMoveName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-md text-white" placeholder="Turbo Slam, Nitro Boost..." />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea required value={moveDesc} onChange={(e) => setMoveDesc(e.target.value)} rows={2} className="w-full bg-slate-900 border border-slate-700 p-2 rounded-md text-white text-sm" placeholder="What does this move do?" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-extrabold p-3 rounded-xl text-lg transition-colors">
          {loading ? '🎨 AI Art Studio is painting your card... (10-15 seconds)' : 'Mint Custom Card'}
        </button>
      </form>
    </main>
  );
}