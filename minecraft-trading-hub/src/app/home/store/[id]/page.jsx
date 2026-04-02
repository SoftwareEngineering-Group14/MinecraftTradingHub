"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '../../../lib/supabaseClient';

/* ── Item card (left scroll list) ── */
function ListingCard({ listing, selected, onSelect }) {
  const offering = listing.listing_items?.filter((li) => li.is_selling_not_recieving) || [];
  const wanting  = listing.listing_items?.filter((li) => !li.is_selling_not_recieving) || [];

  const offerLabel = offering.length
    ? offering.map((li) => `${li.quantity}x ${li.item?.name}`).join(', ')
    : '—';
  const wantLabel = wanting.length
    ? wanting.map((li) => `${li.quantity}x ${li.item?.name}`).join(', ')
    : 'Open trade';

  return (
    <div
      className={`mc-item-card ${selected ? 'mc-item-card-selected' : ''}`}
      onClick={() => onSelect(listing)}
    >
      <div className="mc-item-card-img" style={{ backgroundColor: '#3a2e00' }}>
        <span style={{ fontSize: '30px', position: 'relative', zIndex: 1 }}>📦</span>
      </div>

      <div className="mc-item-card-info">
        <p className="font-press-start text-[8px] leading-relaxed" style={{ color: '#FFF0D0' }}>
          {offerLabel.length > 40 ? offerLabel.slice(0, 38) + '…' : offerLabel}
        </p>
        <p className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>
          🔄 for: {wantLabel.length > 36 ? wantLabel.slice(0, 34) + '…' : wantLabel}
        </p>
      </div>

      {selected && (
        <div
          className="flex items-center justify-center px-3 flex-shrink-0"
          style={{ backgroundColor: '#2D5A1B', borderLeft: '3px solid #000' }}
        >
          <span className="font-press-start text-[8px] text-green-400">▶</span>
        </div>
      )}
    </div>
  );
}

/* ── Right panel: empty state ── */
function EmptyDetail() {
  return (
    <div className="mc-store-right-empty">
      <span style={{ fontSize: '64px', opacity: 0.35 }}>📦</span>
      <p className="font-press-start text-[9px] text-green-400" style={{ opacity: 0.6 }}>
        Select a Listing
      </p>
      <p className="font-space-mono text-[9px] text-center" style={{ color: '#8A6030', maxWidth: '200px', lineHeight: '1.6' }}>
        Click any listing on the left to view full trade details
      </p>
    </div>
  );
}

/* ── Right panel: listing detail ── */
function ListingDetail({ listing }) {
  const offering = listing.listing_items?.filter((li) => li.is_selling_not_recieving) || [];
  const wanting  = listing.listing_items?.filter((li) => !li.is_selling_not_recieving) || [];

  return (
    <div className="mc-store-right-detail">

      <div className="flex gap-4 items-start mb-6 pb-5" style={{ borderBottom: '4px solid #000' }}>
        <div className="mc-detail-img" style={{ backgroundColor: '#3a2e00' }}>
          <span style={{ fontSize: '48px', position: 'relative', zIndex: 1 }}>📦</span>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <p className="font-press-start text-[11px] leading-relaxed" style={{ color: '#FFF0D0' }}>
            Trade Listing
          </p>
          <span
            className="font-press-start text-[6px] px-2 py-1 border-2 inline-block self-start mt-1"
            style={{ backgroundColor: '#3a2e00', color: '#ffe860', borderColor: '#FFD700' }}
          >
            Barter
          </span>
        </div>
      </div>

      {/* Offering section */}
      <div className="mc-detail-section-title" style={{ color: '#8BC34A' }}>
        📤 Offering
      </div>
      {offering.length === 0 ? (
        <p className="font-space-mono text-[9px] mb-4" style={{ color: '#8A6030' }}>Nothing specified</p>
      ) : (
        offering.map((li) => (
          <div key={li.id} className="mc-detail-row">
            <span className="mc-detail-label">{li.item?.name || 'Unknown item'}</span>
            <span className="font-press-start text-[8px]" style={{ color: '#FFF0D0' }}>
              x{li.quantity}
            </span>
          </div>
        ))
      )}

      {/* Wanting section */}
      <div className="mc-detail-section-title mt-4" style={{ color: '#B388FF' }}>
        📥 Wanting
      </div>
      {wanting.length === 0 ? (
        <p className="font-space-mono text-[9px]" style={{ color: '#8A6030' }}>Open trade (anything)</p>
      ) : (
        wanting.map((li) => (
          <div key={li.id} className="mc-detail-row">
            <span className="mc-detail-label">{li.item?.name || 'Unknown item'}</span>
            <span className="font-press-start text-[8px]" style={{ color: '#FFF0D0' }}>
              x{li.quantity}
            </span>
          </div>
        ))
      )}

    </div>
  );
}

/* ── Loading skeleton ── */
function LoadingState() {
  return (
    <div className="mc-store-right-empty">
      <span style={{ fontSize: '48px', opacity: 0.35 }}>⛏️</span>
      <p className="font-press-start text-[9px] text-green-400 mt-4" style={{ opacity: 0.6 }}>
        Loading...
      </p>
    </div>
  );
}

/* ── Store page ── */
export default function StorePage() {
  const { id: storeId } = useParams();
  const [store, setStore]           = useState(null);
  const [listings, setListings]     = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!storeId) return;

    async function loadStore() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { setError('Not authenticated'); setLoading(false); return; }

        // Fetch store details to get the server_id
        const { data: storeData, error: storeErr } = await supabase
          .from('user_stores')
          .select('id, name, description, server_name, status, server_id, profiles!owner_id(username)')
          .eq('id', storeId)
          .single();

        if (storeErr || !storeData) { setError('Store not found'); setLoading(false); return; }
        setStore(storeData);

        // Use the stores/[storeId]/items route to get listings
        const res = await fetch(
          `/api/v1/${storeData.server_id}/stores/${storeId}/items`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || 'Failed to load listings');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setListings(data.listings || []);
      } catch (err) {
        console.error('Failed to load store:', err);
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    loadStore();
  }, [storeId]);

  const handleSelect = (listing) => {
    setSelectedListing((prev) => (prev?.id === listing.id ? null : listing));
  };

  if (loading) {
    return (
      <div className="mc-store-layout">
        <div className="mc-store-left">
          <LoadingState />
        </div>
        <div className="mc-store-right">
          <LoadingState />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mc-store-layout">
        <div className="mc-store-left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <span style={{ fontSize: '48px' }}>⚠️</span>
            <p className="font-press-start text-[9px] mt-4" style={{ color: '#ff8888' }}>{error}</p>
          </div>
        </div>
        <div className="mc-store-right" />
      </div>
    );
  }

  return (
    <div className="mc-store-layout">

      {/* ════════════════════════════════
          LEFT HALF
      ════════════════════════════════ */}
      <div className="mc-store-left">

        {/* ── Store header ── */}
        <div className="mc-store-header">
          <div className="mc-store-header-accent" />
          <div className="mc-store-header-body">
            <div className="flex items-start gap-4">

              <div
                className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
                style={{
                  backgroundColor: '#3a2e00',
                  border: '3px solid #000',
                  boxShadow: '3px 3px 0 #000, inset -2px -2px 0 rgba(0,0,0,0.3)',
                }}
              >
                <span style={{ fontSize: '26px' }}>💰</span>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="font-press-start text-[11px] leading-relaxed mb-2" style={{ color: '#FFF0D0' }}>
                  {store?.name || store?.description || 'Unnamed Store'}
                </h1>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <button className="mc-clickable-tag" style={{ fontSize: '9px' }}>
                    👤 {store?.profiles?.username || 'Unknown'}
                  </button>
                  <span style={{ color: '#5A3A14', fontFamily: 'Space Mono', fontSize: '9px' }}>•</span>
                  <button className="mc-clickable-tag" style={{ fontSize: '9px' }}>
                    🌐 {store?.server_name || 'Unknown Server'}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="font-press-start text-[6px] px-2 py-1 border-2 inline-block"
                    style={{ backgroundColor: '#0f2d00', color: '#7BC63A', borderColor: '#5D8A2C' }}
                  >
                    ● {store?.status || 'active'}
                  </span>
                  <span className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
                    📦 {listings.length} listings
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable listing list ── */}
        <div className="mc-store-items-scroll">
          {listings.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p className="font-space-mono text-[9px]" style={{ color: '#8A6030' }}>No listings yet</p>
            </div>
          ) : (
            listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                selected={selectedListing?.id === listing.id}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* ════════════════════════════════
          RIGHT HALF
      ════════════════════════════════ */}
      <div className="mc-store-right">
        <div className="mc-store-right-header">
          <span className="font-press-start text-[8px] text-green-400">
            {selectedListing ? '📋 Trade Details' : '📋 Browse Listings'}
          </span>
          {selectedListing && (
            <span className="font-space-mono text-[9px] ml-2" style={{ color: '#C4904A' }}>
              — Listing #{selectedListing.id.slice(0, 8)}
            </span>
          )}
        </div>

        {selectedListing
          ? <ListingDetail listing={selectedListing} />
          : <EmptyDetail />
        }
      </div>

    </div>
  );
}
