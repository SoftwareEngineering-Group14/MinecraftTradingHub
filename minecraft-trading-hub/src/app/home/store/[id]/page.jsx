"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';

const INPUT_STYLE = {
  padding: '6px 8px',
  background: '#8a5a2a',
  border: '2px solid #61371f',
  borderRadius: '4px',
  color: '#fff',
  fontFamily: 'Space Mono, monospace',
  fontSize: '10px',
  outline: 'none',
  width: '100%',
};

function getListingFields(listing) {
  const li = listing.listing_items?.[0];
  return {
    title: li?.item?.name || 'Unnamed',
    quantity: li?.quantity ?? null,
    price: li?.cost ?? null,
  };
}

function ListingCard({ listing, selected, onSelect, isDev, onDelete }) {
  const { title, quantity, price } = getListingFields(listing);
  return (
    <div
      onClick={() => onSelect(listing)}
      style={{
        padding: '8px 12px',
        background: selected ? '#5a3510' : '#8a5a2a',
        border: `2px solid ${selected ? '#c28340' : '#61371f'}`,
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </p>
        <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '11px', marginTop: '2px' }}>
          Qty: {quantity ?? '—'}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {price != null && (
          <span style={{ color: '#8fca5c', fontFamily: 'Press Start 2P', fontSize: '10px' }}>
            {price} 🪙
          </span>
        )}
        {isDev && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(listing.id); }}
            style={{ padding: '2px 6px', background: '#7a1c1c', border: '2px solid #5a0e0e', borderRadius: '4px', color: '#ffaaaa', fontFamily: 'Space Mono', fontSize: '11px', cursor: 'pointer', lineHeight: 1 }}
            title="Delete listing"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function ListingDetail({ listing }) {
  const { title, quantity, price } = getListingFields(listing);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '10px' }}>{title}</p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, background: '#5a3510', border: '2px solid #61371f', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
          <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px' }}>Quantity</p>
          <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '12px', marginTop: '6px' }}>{quantity ?? '—'}</p>
        </div>
        <div style={{ flex: 1, background: '#5a3510', border: '2px solid #61371f', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
          <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px' }}>Cost</p>
          <p style={{ color: '#8fca5c', fontFamily: 'Press Start 2P', fontSize: '12px', marginTop: '6px' }}>{price != null ? `${price} 🪙` : '—'}</p>
        </div>
      </div>
    </div>
  );
}

function AddListingForm({ storeId, serverId, token, onSuccess, onCancel }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Title is required.'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/${serverId}/stores/${storeId}/items`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          cost: cost ? parseInt(cost, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add listing'); return; }
      onSuccess(data.listing);
    } catch {
      setError('Failed to add listing');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '9px' }}>New Listing</p>

      <div>
        <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px', marginBottom: '4px' }}>Title *</p>
        <input style={INPUT_STYLE} placeholder="e.g. Diamond Sword" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px', marginBottom: '4px' }}>Quantity</p>
        <input style={INPUT_STYLE} placeholder="e.g. 64" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div>
        <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px', marginBottom: '4px' }}>Cost (coins)</p>
        <input style={INPUT_STYLE} placeholder="e.g. 10" type="number" min="0" step="1" value={cost} onChange={(e) => setCost(e.target.value)} />
      </div>

      {error && <p style={{ color: '#ff8888', fontFamily: 'Space Mono', fontSize: '9px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="green-button" type="submit" disabled={saving} style={{ flex: 1, padding: '7px 10px', fontSize: '9px' }}>
          {saving ? 'Adding...' : 'Add Listing'}
        </button>
        <button type="button" onClick={onCancel}
          style={{ flex: 1, padding: '7px 10px', fontSize: '9px', background: '#5a3510', border: '2px solid #61371f', borderRadius: '4px', color: '#e0c090', fontFamily: 'Space Mono', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function StorePage() {
  const { id: storeId } = useParams();
  const router = useRouter();

  const [store, setStore] = useState(null);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isDev, setIsDev] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  async function loadListings(t, serverId) {
    try {
      const res = await fetch(`/api/v1/${serverId}/stores/${storeId}/items`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      return data.listings || [];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    if (!storeId) return;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const t = session?.access_token;
        if (!t) { setError('Not authenticated'); setLoading(false); return; }
        setToken(t);
        setUserId(session.user?.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_developer')
          .eq('id', session.user.id)
          .single();
        setIsDev(profile?.is_developer || false);

        const storeRes = await fetch(`/api/v1/store`, { headers: { Authorization: `Bearer ${t}` } });
        const storeData = await storeRes.json();
        const found = (storeData.stores || []).find((s) => s.id === storeId);

        if (!found) {
          setError('Store not found or no access.');
          setLoading(false);
          return;
        }

        setStore(found);
        const items = await loadListings(t, found.server_id);
        setListings(items);
      } catch (err) {
        console.error(err);
        setError('Failed to load store.');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function handleListingAdded(newListing) {
    setShowAddForm(false);
    setListings((prev) => [...prev, newListing]);
    setSelectedListing(newListing);
  }

  function handleDeleteListing(listingId) {
    if (!confirm('Delete this listing?')) return;
    fetch(`/api/v1/${store.server_id}/stores/${storeId}/items/${listingId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    if (selectedListing?.id === listingId) setSelectedListing(null);
  }

  const isOwner = store?.owner_id === userId;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '11px' }}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <p style={{ color: '#ff8888', fontFamily: 'Space Mono', fontSize: '11px' }}>{error}</p>
        <button className="green-button" onClick={() => router.back()}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen w-1/2">
      <div className="flex flex-col h-3/4 w-full" 
      style={{ width: '100%', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="green-button" onClick={() => router.back()} style={{ fontSize: '11px', padding: '6px 12px' }}>
            ← Back
          </button>
          <h1 className="heading-pixel" style={{ fontSize: '12px', flex: 1 }}>{store?.name || 'Store'}</h1>
          {(isOwner || isDev) && (
            <button
              className="green-button"
              style={{ fontSize: '11px', padding: '6px 12px' }}
              onClick={() => { setShowAddForm((v) => !v); setSelectedListing(null); }}
            >
              {showAddForm ? 'Cancel' : '+ Add Item'}
            </button>
          )}
        </div>

        <div className="card-container flex-row h-full w-full" style={{ alignItems: 'stretch', minHeight: '400px' }}>

          {/* Left: listing list */}
          <div className="card flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h2 className="heading-pixel" style={{ fontSize: '11px' }}>Items ({listings.length})</h2>
            {listings.length === 0 && (
              <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px' }}>No items yet.</p>
            )}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  selected={selectedListing?.id === listing.id}
                  onSelect={(l) => {
                    setShowAddForm(false);
                    setSelectedListing((prev) => prev?.id === l.id ? null : l);
                  }}
                  isDev={isDev}
                  onDelete={handleDeleteListing}
                />
              ))}
            </div>
          </div>

          {/* Right: detail or add form */}
          <div className="card flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {showAddForm ? (
              <AddListingForm
                storeId={storeId}
                serverId={store?.server_id}
                token={token}
                onSuccess={handleListingAdded}
                onCancel={() => setShowAddForm(false)}
              />
            ) : selectedListing ? (
              <ListingDetail listing={selectedListing} />
            ) : (
              <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '10px' }}>
                Select an item to view details.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
