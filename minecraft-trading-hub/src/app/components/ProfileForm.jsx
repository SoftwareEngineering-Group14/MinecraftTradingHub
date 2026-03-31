"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

const STORE_TYPES = {
  Trading:     { bg: '#3a2e00', accent: '#FFD700', text: '#ffe860', icon: '💰' },
  Farming:     { bg: '#0f2d00', accent: '#5D8A2C', text: '#8BC34A', icon: '🌾' },
  Building:    { bg: '#3c2010', accent: '#c4a14a', text: '#e8cc88', icon: '🧱' },
  Redstone:    { bg: '#4a0000', accent: '#ff2222', text: '#ff8888', icon: '⚡' },
};

const FILLER_OWNED_STORES = [
  { id: 1, name: "Steve's Trading Post", server: 'SurvivalCraft', type: 'Trading'  },
  { id: 2, name: 'Pixel Farm',           server: 'FarmLife MC',   type: 'Farming'  },
  { id: 3, name: 'Block Builder Shop',   server: 'MegaBuild',     type: 'Building' },
];

export default function ProfileForm() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/signin');
          return;
        }
        setUsername(user.user_metadata?.username || 'Unknown Player');
      } catch (err) {
        console.error('Error fetching player profile:', err);
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, [supabase, router]);

  const initial = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <div className="mc-profile-container">

      {/* ── Profile header block ── */}
      <div className="mc-profile-header">
        {/* Large pixel avatar */}
        <div
          className="mc-avatar-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #92400e 0%, #78350f 50%, #92400e 100%)',
          }}
        >
          <span className="font-press-start text-4xl text-amber-200 select-none">
            {loading ? '?' : initial}
          </span>
        </div>

        {/* Username + role */}
        <div className="text-center">
          <p className="font-press-start text-sm text-white mb-2 uppercase leading-relaxed">
            {loading ? 'Loading...' : username}
          </p>
          <p className="font-space-mono text-[10px] text-zinc-500 uppercase tracking-widest">
            Hub Resident
          </p>
        </div>

        {/* Pixel grass divider */}
        <div className="mc-pixel-divider" />

        {/* Stat row */}
        <div className="flex gap-8 text-center">
          <div>
            <p className="font-press-start text-[11px] text-green-400">3</p>
            <p className="font-space-mono text-[9px] text-zinc-500 mt-1">Stores</p>
          </div>
          <div>
            <p className="font-press-start text-[11px] text-green-400">2</p>
            <p className="font-space-mono text-[9px] text-zinc-500 mt-1">Servers</p>
          </div>
          <div>
            <p className="font-press-start text-[11px] text-green-400">47</p>
            <p className="font-space-mono text-[9px] text-zinc-500 mt-1">Trades</p>
          </div>
        </div>
      </div>

      {/* ── Owned stores ── */}
      <div>
        <p className="mc-owned-section-title">Your Stores</p>

        {FILLER_OWNED_STORES.map((store) => {
          const style = STORE_TYPES[store.type] || STORE_TYPES.Trading;
          return (
            <div key={store.id} className="mc-owned-store-card">
              {/* Type icon block */}
              <div
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center border-2 border-black"
                style={{
                  backgroundColor: style.bg,
                  boxShadow: '2px 2px 0 #000',
                }}
              >
                <span style={{ fontSize: '18px' }}>{style.icon}</span>
              </div>

              {/* Store details */}
              <div className="flex-1 overflow-hidden">
                <p className="font-press-start text-[8px] text-white mb-1 truncate leading-relaxed">
                  {store.name}
                </p>
                <p className="font-space-mono text-[9px] text-zinc-500">
                  🌐 {store.server}
                </p>
              </div>

              {/* Type badge */}
              <span
                className="font-press-start text-[6px] px-2 py-1 border-2 flex-shrink-0"
                style={{
                  backgroundColor: style.bg,
                  color: style.text,
                  borderColor: style.accent,
                }}
              >
                {store.type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
