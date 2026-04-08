"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

export default function HomeBaseForm() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [isDev, setIsDev] = useState(false);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerVersion, setNewServerVersion] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const t = session?.access_token || null;
      setToken(t);
      if (t && session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_developer')
          .eq('id', session.user.id)
          .single();
        setIsDev(profile?.is_developer || false);
      }
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchServers = useCallback(async (q) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/servers?search=${encodeURIComponent(q)}&limit=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setServers(data.servers || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchServers(debouncedSearch); }, [fetchServers, debouncedSearch]);

  async function handleDeleteServer(e, serverId) {
    e.stopPropagation();
    if (!confirm('Delete this server? This cannot be undone.')) return;
    await fetch(`/api/v1/servers/${serverId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setServers((prev) => prev.filter((s) => s.id !== serverId));
  }

  async function handleCreateServer(e) {
    e.preventDefault();
    if (!newServerName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/v1/servers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: newServerName.trim(), mc_version: newServerVersion.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreateServer(false);
        setNewServerName('');
        setNewServerVersion('');
        await fetchServers(debouncedSearch);
        if (data.server?.id) router.push(`/home/servers/${data.server.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen px-6">
      <div className="card-container flex-row" style={{ width: '100%', maxWidth: 'min(1400px, 98vw)', height: 'min(95vh, 100%)', padding: '1.5rem' }}>
        <div className="card flex-1" style={{ width: '100%', maxHeight: '100%', minHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '1.25rem', padding: '2rem' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h1 className="heading-pixel" style={{ fontSize: '24px' }}>Servers</h1>
            <button
              className="green-button"
              style={{ padding: '10px 18px', fontSize: '14px' }}
              onClick={() => setShowCreateServer((v) => !v)}
            >
              {showCreateServer ? 'Cancel' : '+ New'}
            </button>
          </div>

          <input
            type="text"
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '14px 16px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '12px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '15px', outline: 'none' }}
          />

          {showCreateServer && (
            <form onSubmit={handleCreateServer} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '2px solid #61371f', paddingTop: '0.5rem' }}>
              <input type="text" placeholder="Server name *" value={newServerName} onChange={(e) => setNewServerName(e.target.value)} required
                style={{ padding: '5px 8px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '4px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '10px', outline: 'none' }} />
              <input type="text" placeholder="MC version (optional)" value={newServerVersion} onChange={(e) => setNewServerVersion(e.target.value)}
                style={{ padding: '5px 8px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '4px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '10px', outline: 'none' }} />
              <button className="green-button" disabled={creating} style={{ padding: '6px 10px', fontSize: '10px' }}>
                {creating ? 'Creating...' : 'Create Server'}
              </button>
            </form>
          )}

          <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loading && <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '11px' }}>Loading...</p>}
            {!loading && servers.length === 0 && (
              <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '11px' }}>No servers found</p>
            )}
            {servers.map((server) => {
              const sp = server.userPermission;
              const memberLabel = sp?.is_member ? '✓ Joined' : sp != null ? '⏳ Pending' : null;
              return (
                <div
                  key={server.id}
                  onClick={() => router.push(`/home/servers/${server.id}`)}
                  style={{
                    padding: '16px 18px',
                    background: '#8a5a2a',
                    border: '2px solid #61371f',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '14px' }}>{server.display_name}</span>
                    <span style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '13px' }}>
                      {server.mc_version || '—'} · {server.profiles?.username || 'Unknown'}
                    </span>
                    {memberLabel && <span style={{ color: '#8fca5c', fontFamily: 'Space Mono', fontSize: '13px' }}>{memberLabel}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {isDev && (
                      <button
                        onClick={(e) => handleDeleteServer(e, server.id)}
                        style={{ padding: '2px 7px', background: '#7a1c1c', border: '2px solid #5a0e0e', borderRadius: '4px', color: '#ffaaaa', fontFamily: 'Space Mono', fontSize: '11px', cursor: 'pointer', lineHeight: 1 }}
                        title="Delete server"
                      >
                        ✕
                      </button>
                    )}
                    <span style={{ color: '#8fca5c', fontFamily: 'Space Mono', fontSize: '12px' }}>▶</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
