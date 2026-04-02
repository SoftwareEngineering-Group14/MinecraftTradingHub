"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabaseClient';

/* ── Styles ── */
const STORE_STYLE = { bg: '#3a2e00', accent: '#FFD700', text: '#ffe860', icon: '💰' };

/* ── Helpers ── */
function getMembershipState(perm) {
  if (!perm) return 'none';
  if (perm.is_member) return 'member';
  if (perm.status === 'pending') return 'pending';
  if (perm.status === 'rejected') return 'rejected';
  return 'none';
}

/* ── Server card (left panel) ── */
function ServerCard({ server, selected, onSelect }) {
  const state = getMembershipState(server.userPermission);

  const badge = {
    member:   { label: '✓ Joined',  bg: '#0f2d00', color: '#7BC63A', border: '#5D8A2C' },
    pending:  { label: '⏳ Pending', bg: '#3a2e00', color: '#FFD700', border: '#b8960a' },
    rejected: { label: '✕ Rejected', bg: '#2d0000', color: '#ff8888', border: '#aa2222' },
    none:     null,
  }[state];

  return (
    <div
      className={`mc-server-card ${selected ? 'mc-server-card-selected' : ''}`}
      onClick={() => onSelect(server)}
      style={{ cursor: 'pointer' }}
    >
      <div className="mc-server-card-icon" style={{ backgroundColor: '#1a2a1a' }}>
        <span style={{ fontSize: '24px' }}>🌐</span>
      </div>

      <div className="mc-server-card-info" style={{ flex: 1, minWidth: 0 }}>
        <p className="font-press-start text-[8px] leading-relaxed mb-1 truncate" style={{ color: '#FFF0D0' }}>
          {server.display_name}
        </p>
        <p className="font-space-mono text-[9px] mb-1" style={{ color: '#E8C888' }}>
          👤 {server.profiles?.username || 'Unknown'}
        </p>
        <p className="font-space-mono text-[8px]" style={{ color: '#8A6030' }}>
          ⚙ {server.mc_version || '—'}
        </p>
      </div>

      <div className="flex flex-col items-end gap-2 flex-shrink-0 px-2">
        {badge && (
          <span
            className="font-press-start text-[5px] px-1.5 py-0.5 border"
            style={{ backgroundColor: badge.bg, color: badge.color, borderColor: badge.border }}
          >
            {badge.label}
          </span>
        )}
        {selected && <span className="font-press-start text-[8px] text-green-400">▶</span>}
      </div>
    </div>
  );
}

/* ── Empty right panel ── */
function EmptyPanel() {
  return (
    <div className="mc-store-right-empty">
      <span style={{ fontSize: '64px', opacity: 0.35 }}>🌐</span>
      <p className="font-press-start text-[9px] text-green-400" style={{ opacity: 0.6 }}>
        Select a Server
      </p>
      <p className="font-space-mono text-[9px] text-center" style={{ color: '#8A6030', maxWidth: '200px', lineHeight: '1.6' }}>
        Browse servers on the left and join to access their stores
      </p>
    </div>
  );
}

/* ── Server header (reused in multiple states) ── */
function ServerHeader({ server }) {
  return (
    <div className="mc-server-panel-header" style={{ borderBottom: '4px solid #000' }}>
      <div className="mc-server-panel-icon" style={{ backgroundColor: '#1a2a1a' }}>
        <span style={{ fontSize: '32px' }}>🌐</span>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-press-start text-[11px] leading-relaxed" style={{ color: '#FFF0D0' }}>
          {server.display_name}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>
            👤 {server.profiles?.username || 'Unknown'}
          </span>
          {server.mc_version && (
            <span
              className="font-press-start text-[6px] px-2 py-1 border-2"
              style={{ backgroundColor: '#1a2a1a', color: '#8BC34A', borderColor: '#5D8A2C' }}
            >
              {server.mc_version}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Not-a-member panel ── */
function JoinPanel({ server, onJoin, joining }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ServerHeader server={server} />
      <div className="mc-store-right-empty" style={{ flex: 1 }}>
        <span style={{ fontSize: '48px', opacity: 0.5 }}>🔒</span>
        <p className="font-press-start text-[9px] mt-4" style={{ color: '#FFF0D0', opacity: 0.8 }}>
          Members Only
        </p>
        <p className="font-space-mono text-[9px] text-center mt-2" style={{ color: '#8A6030', maxWidth: '220px', lineHeight: '1.6' }}>
          Request to join to browse stores and trade with this server's players
        </p>
        <button
          onClick={() => onJoin(server.id)}
          disabled={joining}
          className="font-press-start text-[8px] mt-6 px-5 py-3 border-2"
          style={{
            backgroundColor: joining ? '#1a2a1a' : '#0f2d00',
            color: joining ? '#5A7030' : '#7BC63A',
            borderColor: joining ? '#3a5a20' : '#5D8A2C',
            cursor: joining ? 'not-allowed' : 'pointer',
            boxShadow: '3px 3px 0 #000',
          }}
        >
          {joining ? 'Sending...' : '⛏ Request to Join'}
        </button>
      </div>
    </div>
  );
}

/* ── Pending-approval panel ── */
function PendingPanel({ server }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ServerHeader server={server} />
      <div className="mc-store-right-empty" style={{ flex: 1 }}>
        <span style={{ fontSize: '48px' }}>⏳</span>
        <p className="font-press-start text-[9px] mt-4" style={{ color: '#FFD700' }}>
          Request Pending
        </p>
        <p className="font-space-mono text-[9px] text-center mt-2" style={{ color: '#8A6030', maxWidth: '220px', lineHeight: '1.6' }}>
          A server admin must approve your request before you can access this server's stores
        </p>
      </div>
    </div>
  );
}

/* ── Rejected panel ── */
function RejectedPanel({ server, onJoin, joining }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ServerHeader server={server} />
      <div className="mc-store-right-empty" style={{ flex: 1 }}>
        <span style={{ fontSize: '48px' }}>✕</span>
        <p className="font-press-start text-[9px] mt-4" style={{ color: '#ff8888' }}>
          Request Rejected
        </p>
        <p className="font-space-mono text-[9px] text-center mt-2" style={{ color: '#8A6030', maxWidth: '220px', lineHeight: '1.6' }}>
          Your previous join request was rejected. You may submit a new request.
        </p>
        <button
          onClick={() => onJoin(server.id)}
          disabled={joining}
          className="font-press-start text-[8px] mt-6 px-5 py-3 border-2"
          style={{
            backgroundColor: '#2d0000',
            color: joining ? '#885555' : '#ff8888',
            borderColor: '#aa2222',
            cursor: joining ? 'not-allowed' : 'pointer',
            boxShadow: '3px 3px 0 #000',
          }}
        >
          {joining ? 'Sending...' : '↩ Re-apply'}
        </button>
      </div>
    </div>
  );
}

/* ── Create-server form ── */
function CreateServerForm({ onSubmit, onCancel, creating }) {
  const [displayName, setDisplayName] = useState('');
  const [mcVersion, setMcVersion]     = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (displayName.trim()) onSubmit(displayName.trim(), mcVersion.trim() || null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ padding: '14px 16px', borderBottom: '4px solid #000', backgroundColor: '#001a10' }}
    >
      <p className="font-press-start text-[8px] mb-3" style={{ color: '#7BC63A' }}>🌐 New Server</p>

      <div className="mb-3">
        <label className="font-space-mono text-[9px] block mb-1" style={{ color: '#C4904A' }}>
          Server Name *
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          placeholder="My Survival SMP"
          className="w-full font-space-mono text-[9px] px-2 py-1.5 border-2"
          style={{ backgroundColor: '#0a0a00', color: '#FFF0D0', borderColor: '#5A3A14', outline: 'none' }}
          required
        />
      </div>

      <div className="mb-3">
        <label className="font-space-mono text-[9px] block mb-1" style={{ color: '#C4904A' }}>
          MC Version
        </label>
        <input
          type="text"
          value={mcVersion}
          onChange={(e) => setMcVersion(e.target.value)}
          maxLength={20}
          placeholder="1.21.4"
          className="w-full font-space-mono text-[9px] px-2 py-1.5 border-2"
          style={{ backgroundColor: '#0a0a00', color: '#FFF0D0', borderColor: '#5A3A14', outline: 'none' }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={creating || !displayName.trim()}
          className="font-press-start text-[7px] px-3 py-2 border-2"
          style={{
            backgroundColor: creating ? '#1a2a1a' : '#0f2d00',
            color: creating ? '#5A7030' : '#7BC63A',
            borderColor: '#5D8A2C',
            cursor: creating ? 'not-allowed' : 'pointer',
            boxShadow: '2px 2px 0 #000',
          }}
        >
          {creating ? 'Creating...' : '✓ Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-press-start text-[7px] px-3 py-2 border-2"
          style={{ backgroundColor: '#1a0a0a', color: '#ff8888', borderColor: '#aa2222', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
        >
          ✕ Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Create-store form ── */
function CreateStoreForm({ onSubmit, onCancel, creating }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim(), description.trim());
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '16px', borderBottom: '4px solid #000', backgroundColor: '#1a1a0a' }}>
      <p className="font-press-start text-[8px] mb-3" style={{ color: '#FFD700' }}>🏪 New Store</p>

      <div className="mb-3">
        <label className="font-space-mono text-[9px] block mb-1" style={{ color: '#C4904A' }}>
          Store Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="My Trading Post"
          className="w-full font-space-mono text-[9px] px-2 py-1.5 border-2"
          style={{
            backgroundColor: '#0a0a00',
            color: '#FFF0D0',
            borderColor: '#5A3A14',
            outline: 'none',
          }}
          required
        />
      </div>

      <div className="mb-3">
        <label className="font-space-mono text-[9px] block mb-1" style={{ color: '#C4904A' }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="What does your store offer?"
          className="w-full font-space-mono text-[9px] px-2 py-1.5 border-2 resize-none"
          style={{
            backgroundColor: '#0a0a00',
            color: '#FFF0D0',
            borderColor: '#5A3A14',
            outline: 'none',
          }}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="font-press-start text-[7px] px-3 py-2 border-2"
          style={{
            backgroundColor: creating ? '#1a2a1a' : '#0f2d00',
            color: creating ? '#5A7030' : '#7BC63A',
            borderColor: '#5D8A2C',
            cursor: creating ? 'not-allowed' : 'pointer',
            boxShadow: '2px 2px 0 #000',
          }}
        >
          {creating ? 'Creating...' : '✓ Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-press-start text-[7px] px-3 py-2 border-2"
          style={{
            backgroundColor: '#1a0a0a',
            color: '#ff8888',
            borderColor: '#aa2222',
            cursor: 'pointer',
            boxShadow: '2px 2px 0 #000',
          }}
        >
          ✕ Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Member panel (stores + optional admin section) ── */
function MemberPanel({ server, stores, storesLoading, pendingRequests, onApprove, onReject, onCreateStore, showCreateForm, onToggleCreate, creating }) {
  const isAdmin = server.userPermission?.is_admin;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ServerHeader server={server} />

      {/* Admin: pending requests */}
      {isAdmin && pendingRequests.length > 0 && (
        <div style={{ borderBottom: '4px solid #000', backgroundColor: '#1a1200', padding: '12px 16px' }}>
          <p className="font-press-start text-[7px] mb-2" style={{ color: '#FFD700' }}>
            ⚡ Pending Requests ({pendingRequests.length})
          </p>
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between mb-2 px-2 py-1.5 border"
              style={{ backgroundColor: '#0a0a00', borderColor: '#3a2e00' }}
            >
              <span className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>
                👤 {req.profiles?.username || req.profiles?.name || req.user_id.slice(0, 8)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(req.id)}
                  className="font-press-start text-[6px] px-2 py-1 border"
                  style={{ backgroundColor: '#0f2d00', color: '#7BC63A', borderColor: '#5D8A2C', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
                >
                  ✓
                </button>
                <button
                  onClick={() => onReject(req.id)}
                  className="font-press-start text-[6px] px-2 py-1 border"
                  style={{ backgroundColor: '#2d0000', color: '#ff8888', borderColor: '#aa2222', cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create store toggle */}
      <div style={{ padding: '10px 16px', borderBottom: '4px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
          🏪 {storesLoading ? '...' : `${stores.length} stores`}
        </span>
        {!showCreateForm && (
          <button
            onClick={onToggleCreate}
            className="font-press-start text-[7px] px-3 py-1.5 border-2"
            style={{
              backgroundColor: '#002040',
              color: '#70b8ec',
              borderColor: '#3498DB',
              cursor: 'pointer',
              boxShadow: '2px 2px 0 #000',
            }}
          >
            + Create Store
          </button>
        )}
      </div>

      {/* Create store form */}
      {showCreateForm && (
        <CreateStoreForm
          onSubmit={onCreateStore}
          onCancel={onToggleCreate}
          creating={creating}
        />
      )}

      {/* Stores grid */}
      <div className="mc-server-stores-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {storesLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p className="font-space-mono text-[9px]" style={{ color: '#8A6030' }}>Loading stores...</p>
          </div>
        ) : stores.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span style={{ fontSize: '40px', opacity: 0.35 }}>🏪</span>
            <p className="font-space-mono text-[9px] mt-3" style={{ color: '#8A6030' }}>
              No stores yet — be the first!
            </p>
          </div>
        ) : (
          <div className="mc-server-stores-grid">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/home/store/${store.id}`}
                className="mc-server-store-card"
                style={{ textDecoration: 'none' }}
              >
                <div className="mc-server-store-icon" style={{ backgroundColor: STORE_STYLE.bg }}>
                  <span style={{ fontSize: '36px', position: 'relative', zIndex: 1 }}>💰</span>
                </div>
                <div className="mc-server-store-info">
                  <p className="font-press-start text-[8px] leading-relaxed mb-1" style={{ color: '#FFF0D0' }}>
                    {store.name || store.description || 'Unnamed Store'}
                  </p>
                  {store.description && store.name && (
                    <p className="font-space-mono text-[8px] mb-2" style={{ color: '#8A6030' }}>
                      {store.description.length > 40 ? store.description.slice(0, 38) + '…' : store.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Servers page ── */
export default function ServersPage() {
  const [token, setToken]                   = useState(null);
  const [servers, setServers]               = useState([]);
  const [searchInput, setSearchInput]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading]               = useState(true);
  const [selectedServer, setSelectedServer] = useState(null);
  const [stores, setStores]                 = useState([]);
  const [storesLoading, setStoresLoading]   = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [joining, setJoining]                     = useState(false);
  const [showCreateServer, setShowCreateServer]   = useState(false);
  const [creatingServer, setCreatingServer]       = useState(false);
  const [showCreateForm, setShowCreateForm]       = useState(false);
  const [creating, setCreating]                   = useState(false);

  // Get token once on mount
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch servers when token or search changes
  const fetchServers = useCallback(async (search) => {
    if (!token) return [];
    setLoading(true);
    try {
      const res = await fetch(
        `/api/v1/servers?search=${encodeURIComponent(search)}&limit=30`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const list = data.servers || [];
      setServers(list);
      // Keep selected server in sync with fresh permission data from API
      setSelectedServer((prev) => prev ? (list.find((s) => s.id === prev.id) || prev) : null);
      return list;
    } catch (err) {
      console.error('Failed to load servers:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchServers(debouncedSearch);
  }, [fetchServers, debouncedSearch]);

  async function handleSelectServer(server) {
    if (selectedServer?.id === server.id) { setSelectedServer(null); return; }
    setSelectedServer(server);
    setStores([]);
    setPendingRequests([]);
    setShowCreateForm(false);

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
      } catch (err) {
        console.error('Failed to load server data:', err);
      } finally {
        setStoresLoading(false);
      }
    }
  }

  async function handleCreateServer(displayName, mcVersion) {
    setCreatingServer(true);
    try {
      const res = await fetch('/api/v1/servers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, mc_version: mcVersion }),
      });
      if (res.ok) {
        const { server } = await res.json();
        setShowCreateServer(false);

        // Fetch fresh list — the new server + its permission should be in there
        const list = await fetchServers(debouncedSearch);
        const freshServer = list.find((s) => s.id === server.id);

        // Use fresh API data if available; otherwise fall back to known permission
        const knownPerm = { is_member: true, is_admin: true, status: 'approved' };
        const toSelect = freshServer
          ? { ...freshServer, userPermission: freshServer.userPermission ?? knownPerm }
          : { ...server, profiles: null, userPermission: knownPerm };

        // Patch the servers list so clicking the card later also shows the right state
        setServers((prev) =>
          prev.map((s) =>
            s.id === server.id
              ? { ...s, userPermission: toSelect.userPermission }
              : s
          )
        );

        setSelectedServer(toSelect);
        setStores([]);
        setPendingRequests([]);
        setShowCreateForm(false);
      }
    } catch (err) {
      console.error('Create server failed:', err);
    } finally {
      setCreatingServer(false);
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
    } catch (err) {
      console.error('Join failed:', err);
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

  async function handleCreateStore(name, description) {
    setCreating(true);
    try {
      const res = await fetch(`/api/v1/${selectedServer.id}/stores`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        const storesRes = await fetch(`/api/v1/${selectedServer.id}/stores`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await storesRes.json();
        setStores(data.stores || []);
        setShowCreateForm(false);
      }
    } catch (err) {
      console.error('Create store failed:', err);
    } finally {
      setCreating(false);
    }
  }

  const memberState = getMembershipState(selectedServer?.userPermission);

  return (
    <div className="mc-store-layout">

      {/* ═══════════════════════
          LEFT — server list
      ═══════════════════════ */}
      <div className="mc-store-left">

        {/* Header */}
        <div className="mc-store-header">
          <div className="mc-store-header-accent" />
          <div className="mc-store-header-body">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-press-start text-[10px] leading-relaxed" style={{ color: '#FFF0D0' }}>
                🌐 Servers
              </h1>
              <button
                onClick={() => setShowCreateServer((v) => !v)}
                className="font-press-start text-[7px] px-2 py-1.5 border-2"
                style={{
                  backgroundColor: showCreateServer ? '#1a0a0a' : '#001a10',
                  color: showCreateServer ? '#ff8888' : '#7BC63A',
                  borderColor: showCreateServer ? '#aa2222' : '#5D8A2C',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0 #000',
                }}
              >
                {showCreateServer ? '✕' : '+ New'}
              </button>
            </div>

            {/* Search bar */}
            <div className="flex items-center gap-2">
              <span className="font-space-mono text-[10px]" style={{ color: '#8A6030' }}>🔍</span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search servers..."
                className="flex-1 font-space-mono text-[9px] px-2 py-1 border-2"
                style={{ backgroundColor: '#0a0a00', color: '#FFF0D0', borderColor: '#5A3A14', outline: 'none' }}
              />
            </div>

            <p className="font-space-mono text-[9px] mt-2" style={{ color: '#C4904A' }}>
              {loading ? 'Loading...' : `${servers.length} servers`}
            </p>
          </div>
        </div>

        {/* Create server form (inline, below header) */}
        {showCreateServer && (
          <CreateServerForm
            onSubmit={handleCreateServer}
            onCancel={() => setShowCreateServer(false)}
            creating={creatingServer}
          />
        )}

        {/* Server list */}
        <div className="mc-store-items-scroll">
          {!loading && servers.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p className="font-space-mono text-[9px]" style={{ color: '#8A6030' }}>No servers found</p>
            </div>
          )}
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              selected={selectedServer?.id === server.id}
              onSelect={handleSelectServer}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════
          RIGHT — context panel
      ═══════════════════════ */}
      <div className="mc-store-right">
        <div className="mc-store-right-header">
          <span className="font-press-start text-[8px] text-green-400">
            {selectedServer ? '🏪 ' + selectedServer.display_name : '🌐 Browse Servers'}
          </span>
        </div>

        {!selectedServer && <EmptyPanel />}

        {selectedServer && memberState === 'none' && (
          <JoinPanel server={selectedServer} onJoin={handleJoin} joining={joining} />
        )}

        {selectedServer && memberState === 'pending' && (
          <PendingPanel server={selectedServer} />
        )}

        {selectedServer && memberState === 'rejected' && (
          <RejectedPanel server={selectedServer} onJoin={handleJoin} joining={joining} />
        )}

        {selectedServer && memberState === 'member' && (
          <MemberPanel
            server={selectedServer}
            stores={stores}
            storesLoading={storesLoading}
            pendingRequests={pendingRequests}
            onApprove={handleApprove}
            onReject={handleReject}
            onCreateStore={handleCreateStore}
            showCreateForm={showCreateForm}
            onToggleCreate={() => setShowCreateForm((v) => !v)}
            creating={creating}
          />
        )}
      </div>

    </div>
  );
}
