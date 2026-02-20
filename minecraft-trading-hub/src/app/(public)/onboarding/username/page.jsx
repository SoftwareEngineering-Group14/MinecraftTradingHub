"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UsernamePage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }), 
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update username');

      router.push('/onboarding/interests');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="auth-card">
        
        <div className="text-center space-y-2">
          <h1 className="heading-pixel">
            Set Your Handle
          </h1>
          <p className="font-space-mono text-gray-600 text-sm">
            Choose the name that other players will see in the Trading Hub.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter Username"
              className="auth-input text-center"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              autoFocus
            />
            {error && (
              <p className="text-red-500 font-space-mono text-xs text-center animate-pulse">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-green" 
          >
            {loading ? 'SAVING...' : 'CONTINUE'}
          </button>
        </form>
      </div>
    </div>
  );
}