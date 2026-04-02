"use client";

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

//using createClient here instead of '../lib/supabaseClient' to avoid 'next/headers' issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

export default function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [userServers, setUserServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      setError('');

      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
          router.push('/signin');
          return;
        }

        const user = userData.user;
        setUserId(user.id);
        setEmail(user.email || '');

        // fetch profile row from profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, full_name, bio, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.warn('Profile fetch warning', profileError);
        }

        setUsername(profile?.username || user.user_metadata?.username || 'New Player');
        setAvatarUrl(profile?.avatar_url || `/minecraft-avatars/${encodeURIComponent(user.id)}.png`);

        // Fetch user's servers from user_stores table with server details
        const { data: stores, error: storesError } = await supabase
          .from('user_stores')
          .select('id, server_id, servers(id, name)')
          .eq('user_id', user.id);

        if (!storesError && stores && stores.length > 0) {
          setUserServers(stores);
          setSelectedServerId(stores[0].server_id);
        }
      } catch (err) {
        console.error('Error fetching player profile:', err);
        setError('Could not load profile. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [supabase, router]);

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username?.trim()) {
      setError('Username is required.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        id: userId,
        username: username.trim(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id', returning: 'representation' });

      if (updateError) throw updateError;

      await supabase.auth.updateUser({ data: { username: username.trim() } });

      setSuccess('Profile saved successfully.');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Could not save profile. Please try again later.');
    } finally {
      setSaving(false);
    }
  }

  const inventoryGrid = Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 6 }, (_, col) => ({ id: `${row}-${col}`, occupied: row === col }))
  );

  return (
      <div className="mx-auto flex flex-col md:flex-row gap-4 max-w-[1400px] text-gray-900 p-2 pt-6 pb-4 h-screen overflow-auto">
        <aside className="profile-left flex-wrap md:flex-nowrap w-full md:w-64 md:h-[calc(100vh-120px)] bg-[#6b3f10] rounded-3xl shadow-2xl p-6 border-2 border-[#4f310e]">
          <div className="relative">
            <img
              src={avatarUrl || '/avatar-placeholder.png'}
              alt="avatar"
              className="w-full h-40 object-cover rounded-2xl border-4 border-[#d8c9a3]"
              onError={(ev) => { ev.currentTarget.src = '/avatar-placeholder.png'; }}
            />
            <span className="absolute top-2 left-2 px-3 py-1 bg-[#d6b98d] rounded-full text-xs font-semibold uppercase tracking-wider">
              Account Name
            </span>
          </div>
          <div className="mt-3 text-center">
            <h1 className="text-xl font-bold uppercase tracking-wider text-[#f3e1b8]">{loading ? 'Loading...' : username}</h1>
            <p className="text-xs text-[#eee] mt-1">Trading Hub Resident</p>
          </div>
          <div className="mt-4 space-y-2">
            {userServers.length > 0 ? (
              userServers.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setSelectedServerId(store.server_id)}
                  className={`w-full py-2 rounded-lg text-sm font-bold ${selectedServerId === store.server_id ? 'bg-white text-[#2f2f2f] shadow-lg' : 'bg-[#fdf8e6] text-[#5b3f1d]'} border-2 border-[#d8c9a3] transition`}
                >
                  {store.servers?.name || 'Unknown Server'}
                </button>
              ))
            ) : (
              <p className="text-xs text-[#ccc]">No servers yet</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="mt-4 w-full py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all shadow-md text-sm font-bold"
          >
            Return to Hub
          </button>
        </aside>

        <section className="profile-right flex-1 bg-[#a16a1e] rounded-3xl shadow-2xl p-6 border-2 border-[#7f4e1f] max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="bg-[#d8c0a2] p-5 rounded-3xl h-full">
            <h2 className="text-xl font-bold tracking-wide text-[#52331c]">Account Settings</h2>
            <form onSubmit={saveProfile} className="mt-3 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="block"> 
                  <span className="text-xs uppercase text-[#43312a] text-xs">Username</span>
                  <input
                    className="mt-1 rounded-lg border border-[#b99f7d] p-2 w-full text-sm"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase text-[#43312a]">Email</span>
                  <input
                    className="mt-1 rounded-lg border border-[#b99f7d] p-2 w-full bg-white/60 text-sm"
                    type="email"
                    value={email}
                    readOnly
                  />
                </label>
              </div>

              <div className="inventory-card bg-[#6f4321] rounded-2xl p-2 mt-2">
                <h3 className="text-xs font-semibold text-[#f0e0c5]">Inventory</h3>
                <div className="mt-1 grid grid-cols-6 gap-1">
                  {inventoryGrid.flat().map((cell) => (
                    <div
                      key={cell.id}
                      className={`h-8 rounded-md border ${cell.occupied ? 'bg-[#e7c17a] border-[#8d5d29]' : 'bg-[#bd8f4a] border-[#a67231]'}`}
                    />
                  ))}
                </div>
              </div>

              {error && <p className="error-message text-xs">{error}</p>}
              {success && <p className="text-green-800 text-xs font-semibold">{success}</p>}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all shadow-md active:scale-95 text-sm font-bold" disabled={saving || loading}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 bg-[#aa7b46] hover:bg-[#9a6d3f] text-white rounded-lg transition-all shadow-md text-sm font-bold"
                  onClick={() => router.push('/home')}
                >
                  Back
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
  );
}