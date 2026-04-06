"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

export default function Listings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serverId = searchParams.get('serverId');

  const [token, setToken] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  async function fetchListings() {
    if (!token || !serverId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/${serverId}/listings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(search ? { listingName: search } : {}),
      });
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && serverId) fetchListings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, serverId]);

  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <div className="flex flex-row gap-4 mb-8">
        <button className="green-button" onClick={() => router.push('/home/dashboard')}>
          Back
        </button>
        <h1 className="heading-pixel text-center mb-8">Search bar here</h1>
      </div>

      {!serverId ? (
        <div className="card-container flex-row">
          <div className="card flex-1">
            <h1 className="heading-pixel text-center">listings here</h1>
            <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '11px', textAlign: 'center' }}>
              Select a server from HUB to browse listings
            </p>
            <button className="green-button" onClick={() => router.push('/home')}>Go to HUB</button>
          </div>
        </div>
      ) : (
        <div className="card-container flex-row">
          <div className="card flex-1" style={{ minWidth: '400px' }}>
            <h1 className="heading-pixel text-center" style={{ fontSize: '12px' }}>listings here</h1>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <input
                type="text"
                placeholder="Search listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchListings()}
                style={{ flex: 1, padding: '6px 10px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '6px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '11px', outline: 'none' }}
              />
              <button className="green-button" onClick={fetchListings} style={{ padding: '6px 12px', fontSize: '10px' }}>Search</button>
            </div>
            {loading && <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '11px' }}>Loading...</p>}
            {!loading && listings.length === 0 && (
              <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '11px' }}>No listings found.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              {listings.map((listing) => (
                <div key={listing.id} style={{ padding: '8px 12px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '6px' }}>
                  <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '8px' }}>{listing.name || listing.id}</p>
                  {listing.category && (
                    <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px', marginTop: '3px' }}>{listing.category}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
