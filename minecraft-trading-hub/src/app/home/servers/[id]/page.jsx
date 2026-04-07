"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';

export default function ServerPage() {
  const { id: serverId } = useParams();
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isDev, setIsDev] = useState(false);
  const [server, setServer] = useState(null);
  const [stores, setStores] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [permission, setPermission] = useState(null);

  const [showCreateStore, setShowCreateStore] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function loadStores(t) {
    if (!t || !serverId) return;
    setStoresLoading(true);
    try {
      const [storesRes, reqRes] = await Promise.all([
        fetch(`/api/v1/${serverId}/stores`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`/api/v1/servers/${serverId}/join-requests`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const storesData = await storesRes.json();
      setStores(storesData.stores || []);
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setPendingRequests(reqData.requests || []);
      }
    } catch { /* ignore */ } finally {
      setStoresLoading(false);
    }
  }

  useEffect(() => {
    if (!serverId) return;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const t = session?.access_token;
        if (!t) { router.push('/signin'); return; }
        setToken(t);
        setUserId(session.user?.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_developer')
          .eq('id', session.user.id)
          .single();
        setIsDev(profile?.is_developer || false);

        const res = await fetch(`/api/v1/servers?limit=100`, { headers: { Authorization: `Bearer ${t}` } });
        const data = await res.json();
        const found = (data.servers || []).find((s) => s.id === serverId);
        if (!found) { setLoading(false); return; }
        setServer(found);
        setPermission(found.userPermission);

        if (found.userPermission?.is_member) {
          await loadStores(t);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  async function handleJoin() {
    setJoining(true);
    try {
      await fetch(`/api/v1/servers/${serverId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await fetch(`/api/v1/servers?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const found = (data.servers || []).find((s) => s.id === serverId);
      if (found) { setServer(found); setPermission(found.userPermission); }
    } finally {
      setJoining(false);
    }
  }

  async function handleApprove(requestId) {
    await fetch(`/api/v1/servers/${serverId}/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  async function handleReject(requestId) {
    await fetch(`/api/v1/servers/${serverId}/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  async function handleDeleteStore(e, storeId) {
    e.stopPropagation();
    if (!confirm('Delete this store? This cannot be undone.')) return;
    await fetch(`/api/v1/${serverId}/stores/${storeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setStores((prev) => prev.filter((s) => s.id !== storeId));
  }

  async function handleCreateStore(e) {
    e.preventDefault();
    if (!storeName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch(`/api/v1/${serverId}/stores`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: storeName.trim(), description: storeDesc.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowCreateStore(false);
        setStoreName('');
        setStoreDesc('');
        if (data.store?.id) {
          router.push(`/home/stores/${data.store.id}`);
        } else {
          await loadStores(token);
        }
      } else {
        const data = await res.json();
        setCreateError(data.error || 'Failed to create store');
      }
    } finally {
      setCreating(false);
    }
  }

  const isMember = permission?.is_member;
  const isPending = permission != null && !isMember;
  const isAdmin = permission?.is_admin;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '11px' }}>Loading...</p>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p style={{ color: '#ff8888', fontFamily: 'Space Mono', fontSize: '11px' }}>Server not found.</p>
        <button className="green-button" onClick={() => router.push('/home')}>Back to Servers</button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <div style={{ width: '100%', maxWidth: '800px', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="green-button" onClick={() => router.push('/home')} style={{ fontSize: '9px', padding: '6px 12px' }}>
            ← Back
          </button>
          <h1 className="heading-pixel" style={{ fontSize: '12px', flex: 1 }}>{server.display_name}</h1>
          <span style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px' }}>
            {server.mc_version ? `v${server.mc_version} · ` : ''}Owner: {server.profiles?.username || 'Unknown'}
          </span>
        </div>

        {!isMember && !isPending && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
            <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px' }}>
              Join this server to browse and create stores.
            </p>
            <button className="green-button" onClick={handleJoin} disabled={joining} style={{ padding: '8px 16px', fontSize: '10px' }}>
              {joining ? 'Sending...' : 'Request to Join'}
            </button>
          </div>
        )}

        {isPending && (
          <div className="card">
            <p style={{ color: '#f0c040', fontFamily: 'Space Mono', fontSize: '10px' }}>
              ⏳ Join request pending — awaiting admin approval.
            </p>
          </div>
        )}

        {isMember && (
          <div className="card-container flex-row" style={{ alignItems: 'stretch', minHeight: '400px' }}>

            <div className="card flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="heading-pixel" style={{ fontSize: '9px' }}>
                  Stores {!storesLoading && `(${stores.length})`}
                </h2>
                <button
                  className="green-button"
                  style={{ padding: '4px 10px', fontSize: '9px' }}
                  onClick={() => setShowCreateStore((v) => !v)}
                >
                  {showCreateStore ? 'Cancel' : '+ Create'}
                </button>
              </div>

              {showCreateStore && (
                <form onSubmit={handleCreateStore} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '2px solid #61371f', paddingTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Store name *"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                    style={{ padding: '5px 8px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '4px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '10px', outline: 'none' }}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={storeDesc}
                    onChange={(e) => setStoreDesc(e.target.value)}
                    rows={2}
                    style={{ padding: '5px 8px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '4px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '10px', outline: 'none', resize: 'none' }}
                  />
                  {createError && <p style={{ color: '#ff8888', fontFamily: 'Space Mono', fontSize: '9px' }}>{createError}</p>}
                  <button className="green-button" type="submit" disabled={creating || !storeName.trim()} style={{ padding: '6px 10px', fontSize: '9px' }}>
                    {creating ? 'Creating...' : 'Create Store'}
                  </button>
                </form>
              )}

              {storesLoading && <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '10px' }}>Loading stores...</p>}
              {!storesLoading && stores.length === 0 && !showCreateStore && (
                <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px' }}>No stores yet. Create one!</p>
              )}

              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {stores.map((store) => (
                  <div
                    key={store.id}
                    onClick={() => router.push(`/home/stores/${store.id}`)}
                    style={{
                      padding: '8px 12px',
                      background: '#8a5a2a',
                      border: '2px solid #61371f',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '8px' }}>{store.name || 'Unnamed Store'}</p>
                      {store.description && (
                        <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px', marginTop: '3px' }}>
                          {store.description.length > 50 ? store.description.slice(0, 48) + '…' : store.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {isDev && (
                        <button
                          onClick={(e) => handleDeleteStore(e, store.id)}
                          style={{ padding: '2px 7px', background: '#7a1c1c', border: '2px solid #5a0e0e', borderRadius: '4px', color: '#ffaaaa', fontFamily: 'Space Mono', fontSize: '11px', cursor: 'pointer', lineHeight: 1 }}
                          title="Delete store"
                        >
                          ✕
                        </button>
                      )}
                      <span style={{ color: '#8fca5c', fontFamily: 'Space Mono', fontSize: '12px' }}>▶</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="card flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h2 className="heading-pixel" style={{ fontSize: '9px' }}>
                  Join Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </h2>
                {pendingRequests.length === 0 ? (
                  <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px' }}>No pending requests.</p>
                ) : (
                  <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pendingRequests.map((req) => (
                      <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#5a3510', border: '2px solid #61371f', borderRadius: '4px' }}>
                        <span style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px' }}>
                          {req.profiles?.username || req.user_id?.slice(0, 8)}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="green-button" onClick={() => handleApprove(req.id)} style={{ padding: '3px 8px', fontSize: '9px' }}>✓</button>
                          <button onClick={() => handleReject(req.id)} style={{ padding: '3px 8px', fontSize: '9px', background: '#8b2222', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
