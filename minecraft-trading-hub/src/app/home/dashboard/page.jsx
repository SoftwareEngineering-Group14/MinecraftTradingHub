"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useViewMode } from '../../contexts/ViewModeContext';
import { createClient } from '../../lib/supabaseClient';

const STORE_TYPES = {
  Redstone:     { bg: '#4a0000', accent: '#ff2222', text: '#ff8888', icon: '⚡' },
  Building:     { bg: '#3c2010', accent: '#c4a14a', text: '#e8cc88', icon: '🧱' },
  PvP:          { bg: '#4a1000', accent: '#ff6600', text: '#ffaa60', icon: '⚔️' },
  Farming:      { bg: '#0f2d00', accent: '#5D8A2C', text: '#8BC34A', icon: '🌾' },
  Trading:      { bg: '#3a2e00', accent: '#FFD700', text: '#ffe860', icon: '💰' },
  'Rare Items': { bg: '#280040', accent: '#9B59B6', text: '#c388db', icon: '💎' },
  Hardcore:     { bg: '#0a0a0a', accent: '#888888', text: '#cccccc', icon: '💀' },
  Creative:     { bg: '#002040', accent: '#3498DB', text: '#70b8ec', icon: '🎨' },
};

const DEFAULT_STYLE = STORE_TYPES.Trading;

function ListingCard({ listing, isAdminView }) {
  const style = DEFAULT_STYLE;

  return (
    <div className="mc-listing-card" style={{ position: 'relative' }}>

      {isAdminView && (
        <button
          className="mc-admin-delete-btn"
          title="Delete listing"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
        >
          ✕
        </button>
      )}

      <Link href={`/home/store/${listing.id}`} className="block" style={{ textDecoration: 'none', color: 'inherit' }}>

        <div className="mc-card-image" style={{ backgroundColor: style.bg }}>
          <span style={{ fontSize: '44px', position: 'relative', zIndex: 1 }}>
            {style.icon}
          </span>
        </div>

        <div className="mc-card-info">
          <p className="font-press-start text-[9px] leading-relaxed mb-3" style={{ color: '#FFF0D0' }}>
            {listing.name || listing.description || 'Unnamed Store'}
          </p>

          <div className="mb-1 flex items-center gap-1">
            <span className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>🌐</span>
            <button className="mc-clickable-tag" onClick={(e) => e.preventDefault()}>
              {listing.server_name || 'Unknown Server'}
            </button>
          </div>

          <div className="mb-3 flex items-center gap-1">
            <span className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>👤</span>
            <button className="mc-clickable-tag" onClick={(e) => e.preventDefault()}>
              {listing.profiles?.username || 'Unknown'}
            </button>
          </div>

          <span
            className="mc-type-badge"
            style={{ backgroundColor: style.bg, color: style.text, borderColor: style.accent }}
          >
            {listing.status || 'active'}
          </span>
        </div>

      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px' }}>
      <span style={{ fontSize: '64px', opacity: 0.35 }}>🏪</span>
      <p className="font-press-start text-[9px] text-green-400 mt-4" style={{ opacity: 0.6 }}>
        No Stores Found
      </p>
      <p className="font-space-mono text-[9px] mt-2" style={{ color: '#8A6030' }}>
        Join a server to see its active stores here
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { isAdminView } = useViewMode();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all servers the user is a member of
        const { data: memberships } = await supabase
          .from('server_permissions')
          .select('server_id')
          .eq('user_id', user.id)
          .eq('is_member', true);

        if (!memberships?.length) return;

        const serverIds = memberships.map((m) => m.server_id);

        // Fetch active stores from all those servers, joining owner username
        const { data: storeData } = await supabase
          .from('user_stores')
          .select('id, name, description, server_name, status, profiles!owner_id(username)')
          .in('server_id', serverIds)
          .eq('status', 'active')
          .limit(24);

        setStores(storeData || []);
      } catch (err) {
        console.error('Failed to load stores:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStores();
  }, []);

  return (
    <div>
      <div className="mc-dashboard-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-press-start text-sm text-green-400 mb-2">
              ⛏ Active Stores
            </h1>
            <p className="font-space-mono text-[10px] uppercase tracking-widest" style={{ color: '#C4904A' }}>
              {loading ? 'Loading...' : `${stores.length} stores across your servers`}
            </p>
          </div>

          {isAdminView && (
            <div
              className="flex items-center gap-2 px-3 py-2 border-2 border-yellow-600"
              style={{ backgroundColor: '#3A2800', boxShadow: '2px 2px 0 #000' }}
            >
              <span className="font-press-start text-[7px] text-yellow-400">⚡ ADMIN MODE</span>
            </div>
          )}
        </div>
      </div>

      <div className="mc-listings-grid">
        {loading ? null : stores.length === 0 ? (
          <EmptyState />
        ) : (
          stores.map((store) => (
            <ListingCard key={store.id} listing={store} isAdminView={isAdminView} />
          ))
        )}
      </div>
    </div>
  );
}
