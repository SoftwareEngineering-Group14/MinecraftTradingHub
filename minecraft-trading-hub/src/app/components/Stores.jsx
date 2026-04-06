"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

export default function Stores() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serverId = searchParams.get('serverId');
  const storeId = searchParams.get('storeId');

  const [token, setToken] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  useEffect(() => {
    if (!token || !serverId) return;
    setLoading(true);
    fetch(`/api/v1/${serverId}/stores`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setStores(data.stores || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, serverId]);

  useEffect(() => {
    if (storeId && stores.length > 0) {
      const store = stores.find((s) => s.id === storeId);
      if (store) loadStoreItems(store);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, stores]);

  async function loadStoreItems(store) {
    setSelectedStore(store);
    setItems([]);
    if (!token || !serverId) return;
    setItemsLoading(true);
    try {
      const res = await fetch(`/api/v1/${serverId}/stores/${store.id}/items`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setItems(data.listings || []);
    } catch {
      // ignore
    } finally {
      setItemsLoading(false);
    }
  }

  function handleSelectStore(store) {
    if (selectedStore?.id === store.id) { setSelectedStore(null); setItems([]); return; }
    loadStoreItems(store);
  }

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
            <h1 className="heading-pixel text-center">stores here</h1>
            <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '11px', textAlign: 'center' }}>
              Select a server from HUB to browse stores
            </p>
            <button className="green-button" onClick={() => router.push('/home')}>Go to HUB</button>
          </div>
        </div>
      ) : (
        <div className="card-container flex-row" style={{ alignItems: 'stretch', maxWidth: '800px', width: '100%' }}>
          <div className="card flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h1 className="heading-pixel text-center" style={{ fontSize: '12px' }}>stores here</h1>
            {loading && <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '11px' }}>Loading...</p>}
            {!loading && stores.length === 0 && (
              <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '11px' }}>No stores found.</p>
            )}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stores.map((store) => (
                <div key={store.id} onClick={() => handleSelectStore(store)}
                  style={{
                    padding: '8px 12px',
                    background: selectedStore?.id === store.id ? '#5a3510' : '#8a5a2a',
                    border: `2px solid ${selectedStore?.id === store.id ? '#c28340' : '#61371f'}`,
                    borderRadius: '6px', cursor: 'pointer',
                  }}>
                  <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '8px' }}>{store.name || 'Unnamed Store'}</p>
                  {store.description && (
                    <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '9px', marginTop: '3px' }}>{store.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card flex-1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!selectedStore ? (
              <h1 className="heading-pixel text-center" style={{ fontSize: '12px' }}>Select a store</h1>
            ) : (
              <>
                <h1 className="heading-pixel" style={{ fontSize: '11px' }}>{selectedStore.name}</h1>
                {itemsLoading && <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '11px' }}>Loading items...</p>}
                {!itemsLoading && items.length === 0 && (
                  <p style={{ color: '#e0c090', fontFamily: 'Space Mono', fontSize: '11px' }}>No listings yet.</p>
                )}
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {items.map((item) => (
                    <div key={item.id} style={{ padding: '8px 12px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '6px' }}>
                      <p style={{ color: '#fff', fontFamily: 'Press Start 2P', fontSize: '8px' }}>{item.name || item.id}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
