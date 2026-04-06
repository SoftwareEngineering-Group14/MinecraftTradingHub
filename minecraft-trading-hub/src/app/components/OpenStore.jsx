"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../lib/supabaseClient';

export default function OpenStore() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serverId = searchParams.get('serverId');

  const [token, setToken] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !serverId) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/${serverId}/stores`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (res.ok) {
        setSuccess(true);
        setName('');
        setDescription('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create store');
      }
    } catch {
      setError('Failed to create store');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col">
      <button className="green-button" onClick={() => router.push('/home/dashboard')}>
        Back
      </button>
      <div className="card-container flex-row">
        <div className="card flex-1">
          <h1 className="heading-pixel text-center">In-game Inventory</h1>
        </div>
        <div className="card-container flex-col">
          <div className="card flex-1">
            <h1 className="heading-pixel text-center">Offer</h1>
          </div>
          <div className="card flex-1">
            <h1 className="heading-pixel text-center">Ask</h1>
          </div>
        </div>
        <div className="card flex-1" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h1 className="heading-pixel text-center">Open a Store</h1>
          {!serverId ? (
            <>
              <p style={{ color: '#fff', fontFamily: 'Space Mono', fontSize: '11px', textAlign: 'center' }}>
                Select a server from HUB first
              </p>
              <button className="green-button" onClick={() => router.push('/home')}>Go to HUB</button>
            </>
          ) : success ? (
            <>
              <p style={{ color: '#8fca5c', fontFamily: 'Space Mono', fontSize: '11px', textAlign: 'center' }}>Store created!</p>
              <button className="green-button" onClick={() => setSuccess(false)}>Create Another</button>
              <button className="green-button" onClick={() => router.push(`/home/stores?serverId=${serverId}`)}>View Stores</button>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <input
                type="text"
                placeholder="Store name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ padding: '8px 12px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '6px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '11px', outline: 'none', width: '100%' }}
              />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ padding: '8px 12px', background: '#8a5a2a', border: '2px solid #61371f', borderRadius: '6px', color: '#fff', fontFamily: 'Space Mono, monospace', fontSize: '11px', outline: 'none', width: '100%', resize: 'none' }}
              />
              {error && <p style={{ color: '#ff8888', fontFamily: 'Space Mono', fontSize: '10px' }}>{error}</p>}
              <button className="green-button" type="submit" disabled={creating || !name.trim()}>
                {creating ? 'Creating...' : 'Create Store'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
