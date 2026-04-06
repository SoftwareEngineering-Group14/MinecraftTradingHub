"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

export default function HomeBaseForm() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedServer, setSelectedServer] = useState(null);
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [joining, setJoining] = useState(false);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerVersion, setNewServerVersion] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchServers = useCallback(async (q) => {
    if (!token) return [];
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/servers?search=${encodeURIComponent(q)}&limit=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const list = data.servers || [];
      setServers(list);
      setSelectedServer((prev) => prev ? (list.find((s) => s.id === prev.id) || prev) : null);
      return list;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchServers(debouncedSearch); }, [fetchServers, debouncedSearch]);

  async function handleSelectServer(server) {
    if (selectedServer?.id === server.id) { setSelectedServer(null); return; }
    setSelectedServer(server);
    setStores([]);
    setPendingRequests([]);

    if (server.userPermission?.is_member) {
      setStoresLoading(true);
      try {
        const [storesRes, reqRes] = await Promise.all([
          fetch(`/api/v1/${server.id}/stores`, { headers: { Authorization: `Bearer ${token}` } }),
          server.userPermission?.is_admin
            ? fetch(`/api/v1/servers/${server.id}/join-requests`, { headers: { Authorization: `Bearer ${token}` } })
            : Promise.resolve(null),
        ]);
        const storesData = await storesRes.json();
        setStores(storesData.stores || []);
        if (reqRes?.ok) {
          const reqData = await reqRes.json();
          setPendingRequests(reqData.requests || []);
        }
      } catch {
        // ignore
      } finally {
        setStoresLoading(false);
      }
    }
  }

  async function handleJoin(serverId) {
    setJoining(true);
    try {
      await fetch(`/api/v1/servers/${serverId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchServers(debouncedSearch);
    } finally {
      setJoining(false);
    }
  }

  async function handleApprove(requestId) {
    await fetch(`/api/v1/servers/${selectedServer.id}/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  async function handleReject(requestId) {
    await fetch(`/api/v1/servers/${selectedServer.id}/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
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
        setShowCreateServer(false);
        setNewServerName('');
        setNewServerVersion('');
        await fetchServers(debouncedSearch);
      }
    } finally {
      setCreating(false);
    }
  }

  const perm = selectedServer?.userPermission;
  const isMember = perm?.is_member;
  const isPending = !isMember && perm?.status === 'pending';
  const isRejected = !isMember && perm?.status === 'rejected';
  const isAdmin = perm?.is_admin;

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="card-container flex-row" style={{ width: '100%', maxWidth: '900px', height: '80vh', alignItems: 'stretch' }}>

        {/* Left: server list */}
        <div className="card flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="heading-pixel" style={{ fontSize: '12px' }}>Servers</h1>
            <button
              className="green-button"
              style={{ padding: '6px 12px', fontSize: '10px' }}
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
            style={{ padding: '6px 10px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '6px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '11px', outline: 'none' }}
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

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {loading && <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '11px' }}>Loading...</p>}
            {!loading && servers.length === 0 && (
              <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '11px' }}>No servers found</p>
            )}
            {servers.map((server) => {
              const sp = server.userPermission;
              const memberLabel = sp?.is_member ? '✓ Joined' : sp?.status === 'pending' ? '⏳ Pending' : sp?.status === 'rejected' ? '✕ Rejected' : null;
              return (
                <div
                  key={server.id}
                  onClick={() => handleSelectServer(server)}
                  style={{
                    padding: '8px 12px', background: selectedServer?.id === server.id ? '#5a3510' : '#8a5a2a',
                    border: `2px solid ${selectedServer?.id === server.id ? '#c28340' : '#61371f'}`,
                    borderRadius: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px',
                  }}
                >
                  <span style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '8px' }}>{server.display_name}</span>
                  <span style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px' }}>
                    {server.mc_version || '—'} · {server.profiles?.username || 'Unknown'}
                  </span>
                  {memberLabel && <span style={{ color: '#8fca5c', fontFamily: 'Space Mono', fontSize: '9px' }}>{memberLabel}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: server detail */}
        <div className="card flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!selectedServer && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <h1 className="heading-pixel text-center" style={{ fontSize: '12px' }}>server info here</h1>
              <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px', marginTop: '8px', textAlign: 'center' }}>
                Select a server to view details
              </p>
            </div>
          )}

          {selectedServer && (
            <>
              <div>
                <h1 className="heading-pixel" style={{ fontSize: '11px' }}>{selectedServer.display_name}</h1>
                <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px', marginTop: '4px' }}>
                  {selectedServer.mc_version ? `v${selectedServer.mc_version} · ` : ''}Owner: {selectedServer.profiles?.username || 'Unknown'}
                </p>
              </div>

              {!isMember && !isPending && !isRejected && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px' }}>Join this server to browse its stores.</p>
                  <button className="green-button" onClick={() => handleJoin(selectedServer.id)} disabled={joining} style={{ padding: '8px 16px', fontSize: '10px' }}>
                    {joining ? 'Sending...' : 'Request to Join'}
                  </button>
                </div>
              )}

              {isPending && <p style={{ color: '#f0c040', fontFamily: 'Space Mono', fontSize: '10px' }}>⏳ Join request pending — awaiting admin approval.</p>}

              {isRejected && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <p style={{ color: '#ff8888', fontFamily: 'Space Mono', fontSize: '10px' }}>✕ Request rejected. You may re-apply.</p>
                  <button className="green-button" onClick={() => handleJoin(selectedServer.id)} disabled={joining} style={{ padding: '8px 16px', fontSize: '10px' }}>
                    {joining ? 'Sending...' : 'Re-apply'}
                  </button>
                </div>
              )}

              {isMember && (
                <>
                  {isAdmin && pendingRequests.length > 0 && (
                    <div style={{ borderTop: '2px solid #61371f', paddingTop: '8px' }}>
                      <p style={{ color: '#f0c040', fontFamily: 'Space Mono', fontSize: '10px', marginBottom: '6px' }}>
                        Pending Requests ({pendingRequests.length})
                      </p>
                      {pendingRequests.map((req) => (
                        <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', padding: '4px 8px', background: '#5a3510', borderRadius: '4px' }}>
                          <span style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px' }}>{req.profiles?.username || req.user_id?.slice(0, 8)}</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="green-button" onClick={() => handleApprove(req.id)} style={{ padding: '3px 8px', fontSize: '9px' }}>✓</button>
                            <button onClick={() => handleReject(req.id)} style={{ padding: '3px 8px', fontSize: '9px', background: '#8b2222', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: '2px solid #61371f', paddingTop: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '10px' }}>
                        {storesLoading ? 'Loading...' : `${stores.length} store${stores.length !== 1 ? 's' : ''}`}
                      </p>
                      <button className="green-button" style={{ padding: '5px 10px', fontSize: '9px' }}
                        onClick={() => router.push(`/home/openStore?serverId=${selectedServer.id}`)}>
                        + Create Store
                      </button>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {stores.length === 0 && !storesLoading && (
                        <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px' }}>No stores yet.</p>
                      )}
                      {stores.map((store) => (
                        <div key={store.id}
                          onClick={() => router.push(`/home/stores?serverId=${selectedServer.id}&storeId=${store.id}`)}
                          style={{ padding: '8px 12px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '6px', cursor: 'pointer' }}>
                          <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '8px' }}>{store.name || 'Unnamed Store'}</p>
                          {store.description && (
                            <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px', marginTop: '3px' }}>
                              {store.description.length > 50 ? store.description.slice(0, 48) + '…' : store.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
