"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

const DEFAULT_STORE_STYLE = { bg: '#3a2e00', accent: '#FFD700', text: '#ffe860', icon: '💰' };

export default function ProfileForm() {
  const [username, setUsername]           = useState('');
  const [stores, setStores]               = useState([]);
  const [servers, setServers]             = useState([]);
  const [pendingByServer, setPendingByServer] = useState({});  // serverId → requests[]
  const [loading, setLoading]             = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.push('/signin'); return; }

        setUsername(user.user_metadata?.username || 'Unknown Player');

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const authHeaders = { Authorization: `Bearer ${token}` };

        // Fetch stores + all servers in parallel
        const [storesRes, serversRes] = await Promise.all([
          fetch('/api/v1/store', { headers: authHeaders }),
          fetch('/api/v1/servers?limit=100', { headers: authHeaders }),
        ]);

        if (storesRes.ok) {
          const data = await storesRes.json();
          setStores(data.stores || []);
        }

        if (serversRes.ok) {
          const data = await serversRes.json();
          // Only show servers the user is a member of
          const myServers = (data.servers || []).filter(
            (s) => s.userPermission?.is_member
          );
          setServers(myServers);

          // For each server the user admins, fetch pending join requests
          const adminServers = myServers.filter((s) => s.userPermission?.is_admin);
          const requestFetches = adminServers.map((s) =>
            fetch(`/api/v1/servers/${s.id}/join-requests`, { headers: authHeaders })
              .then((r) => r.ok ? r.json() : { requests: [] })
              .then((d) => [s.id, d.requests || []])
          );

          const results = await Promise.all(requestFetches);
          const map = {};
          results.forEach(([serverId, requests]) => {
            if (requests.length > 0) map[serverId] = requests;
          });
          setPendingByServer(map);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase, router]);

  async function handleApprove(serverId, requestId) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    await fetch(`/api/v1/servers/${serverId}/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    setPendingByServer((prev) => ({
      ...prev,
      [serverId]: prev[serverId].filter((r) => r.id !== requestId),
    }));
  }

  async function handleReject(serverId, requestId) {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    await fetch(`/api/v1/servers/${serverId}/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });
    setPendingByServer((prev) => ({
      ...prev,
      [serverId]: prev[serverId].filter((r) => r.id !== requestId),
    }));
  }

  const initial = username ? username.charAt(0).toUpperCase() : '?';
  const totalPending = Object.values(pendingByServer).reduce((n, arr) => n + arr.length, 0);

  return (
    <div className="mc-profile-container">

      {/* ── Profile header ── */}
      <div className="mc-profile-header">
        <div
          className="mc-avatar-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #92400e 0%, #78350f 50%, #92400e 100%)' }}
        >
          <span className="font-press-start text-4xl text-amber-200 select-none">
            {loading ? '?' : initial}
          </span>
        </div>

        <div className="text-center">
          <p className="font-press-start text-sm mb-2 uppercase leading-relaxed" style={{ color: '#FFF0D0' }}>
            {loading ? 'Loading...' : username}
          </p>
          <p className="font-space-mono text-[10px] uppercase tracking-widest" style={{ color: '#C4904A' }}>
            Hub Resident
          </p>
        </div>

        <div className="mc-pixel-divider" />

        <div className="flex gap-8 text-center">
          <div>
            <p className="font-press-start text-[11px] text-green-400">{loading ? '—' : stores.length}</p>
            <p className="font-space-mono text-[9px] mt-1" style={{ color: '#C4904A' }}>Stores</p>
          </div>
          <div>
            <p className="font-press-start text-[11px] text-green-400">{loading ? '—' : servers.length}</p>
            <p className="font-space-mono text-[9px] mt-1" style={{ color: '#C4904A' }}>Servers</p>
          </div>
          <div>
            <p className="font-press-start text-[11px] text-green-400">—</p>
            <p className="font-space-mono text-[9px] mt-1" style={{ color: '#C4904A' }}>Trades</p>
          </div>
        </div>
      </div>

      {/* ── Pending join requests ── */}
      {totalPending > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <p className="mc-owned-section-title" style={{ color: '#FFD700' }}>
            ⚡ Pending Requests ({totalPending})
          </p>
          {Object.entries(pendingByServer).map(([serverId, requests]) => {
            const srv = servers.find((s) => s.id === serverId);
            return requests.map((req) => (
              <div key={req.id} className="mc-owned-store-card">
                <div className="flex-1 overflow-hidden">
                  <p className="font-press-start text-[7px] mb-1 truncate leading-relaxed" style={{ color: '#FFF0D0' }}>
                    👤 {req.profiles?.username || req.profiles?.name || req.user_id?.slice(0, 8)}
                  </p>
                  <p className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
                    🌐 {srv?.display_name || 'Unknown Server'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(serverId, req.id)}
                    className="font-press-start text-[6px] px-2 py-1 border"
                    style={{ backgroundColor: '#0f2d00', color: '#7BC63A', borderColor: '#5D8A2C', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleReject(serverId, req.id)}
                    className="font-press-start text-[6px] px-2 py-1 border"
                    style={{ backgroundColor: '#2d0000', color: '#ff8888', borderColor: '#aa2222', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ));
          })}
        </div>
      )}

      {/* ── Servers ── */}
      <div style={{ marginBottom: '8px' }}>
        <p className="mc-owned-section-title">Your Servers</p>

        {loading && (
          <p className="font-space-mono text-[9px] mt-2" style={{ color: '#8A6030' }}>Loading...</p>
        )}
        {!loading && servers.length === 0 && (
          <p className="font-space-mono text-[9px] mt-2" style={{ color: '#8A6030' }}>No servers yet</p>
        )}

        {servers.map((server) => (
          <div key={server.id} className="mc-owned-store-card">
            <div
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center border-2 border-black"
              style={{ backgroundColor: '#1a2a1a', boxShadow: '2px 2px 0 #000' }}
            >
              <span style={{ fontSize: '18px' }}>🌐</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-press-start text-[8px] mb-1 truncate leading-relaxed" style={{ color: '#FFF0D0' }}>
                {server.display_name}
              </p>
              <p className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
                {server.mc_version || 'No version set'}
              </p>
            </div>
            {server.userPermission?.is_admin && (
              <span
                className="font-press-start text-[5px] px-1.5 py-0.5 border flex-shrink-0"
                style={{ backgroundColor: '#3a2e00', color: '#FFD700', borderColor: '#b8960a' }}
              >
                ADMIN
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Owned stores ── */}
      <div>
        <p className="mc-owned-section-title">Your Stores</p>

        {loading && (
          <p className="font-space-mono text-[9px] mt-2" style={{ color: '#8A6030' }}>Loading...</p>
        )}
        {!loading && stores.length === 0 && (
          <p className="font-space-mono text-[9px] mt-2" style={{ color: '#8A6030' }}>No stores yet</p>
        )}

        {stores.map((store) => {
          const style = DEFAULT_STORE_STYLE;
          return (
            <div key={store.id} className="mc-owned-store-card">
              <div
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center border-2 border-black"
                style={{ backgroundColor: style.bg, boxShadow: '2px 2px 0 #000' }}
              >
                <span style={{ fontSize: '18px' }}>{style.icon}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-press-start text-[8px] mb-1 truncate leading-relaxed" style={{ color: '#FFF0D0' }}>
                  {store.name || store.description || 'Unnamed Store'}
                </p>
                <p className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
                  🌐 {store.server_name || 'Unknown Server'}
                </p>
              </div>
              <span
                className="font-press-start text-[6px] px-2 py-1 border-2 flex-shrink-0"
                style={{ backgroundColor: style.bg, color: style.text, borderColor: style.accent }}
              >
                {store.status || 'active'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
