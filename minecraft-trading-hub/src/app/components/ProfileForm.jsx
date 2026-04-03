"use client";

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

//using createClient here instead of '../lib/supabaseClient' to avoid 'next/headers' issues
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const MASTER_INTERESTS = ["Redstone", "PVP", "Building", "Farming", "Alchemy", "Trading", "Exploration", "Creative"];

export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

const supabase = createClient();


export default function ProfileForm() {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [memberSince, setMemberSince] = useState('');

  const [activeTab, setActiveTab] = useState('settings');
  const [myServers, setMyServers] = useState([]);
  const [serversLoading, setServersLoading] = useState(false);

  // Join requests: { serverId -> [requests] }
  const [joinRequests, setJoinRequests] = useState({});
  const [requestsLoading, setRequestsLoading] = useState(false);

  const router = useRouter();


  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      setError('');

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push('/signin');
          return;
        }
        const user = session.user;
        const accessToken = session.access_token;
        setToken(accessToken);
        setUserId(user.id);
        setEmail(user.email || '');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, name, role, interests')
          .eq('id', user.id)
          .single();
        setIsDev(profile?.role === 'admin');
        setInterests(Array.isArray(profile?.interests) ? profile.interests : []);

        if (profileError && profileError.code !== 'PGRST116') {
          console.warn('Profile fetch warning', profileError);
        }

        const customPath = `${user.id}.png`;
        const totalSkins = 10;
        const idSum = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const skinNumber = (idSum % totalSkins) + 1;
        const randomPath = `avatar_${skinNumber}.png`;

        const { data: fileExists } = await supabase.storage
          .from('avatars')
          .list('', { search: customPath})

        const finalPath = fileExists && fileExists.length > 0 ? customPath : randomPath;

        const { data: storageData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(finalPath);

        setUsername(profile?.username || user.user_metadata?.username || 'New Player');
        setAvatarUrl(`${storageData?.publicUrl}?t=${Date.now()}`);

        const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });
        setMemberSince(joinDate);

        // Fetch servers the user is a member of
        fetchMyServers(accessToken);
      } catch (err) {
        console.error('Error fetching player profile:', err);
        setError('Could not load profile. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [router]);

  async function fetchMyServers(accessToken) {
    const t = accessToken || token;
    if (!t) return;
    setServersLoading(true);
    try {
      const res = await fetch('/api/v1/servers?limit=50', { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      const members = (data.servers || []).filter((s) => s.userPermission?.is_member);
      setMyServers(members);
    } catch {
      // ignore
    } finally {
      setServersLoading(false);
    }
  }

  async function fetchJoinRequests(accessToken) {
    const t = accessToken || token;
    if (!t) return;
    setRequestsLoading(true);
    try {
      const res = await fetch('/api/v1/servers?limit=50', { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      const adminServers = (data.servers || []).filter((s) => s.userPermission?.is_admin);

      const results = await Promise.all(
        adminServers.map(async (server) => {
          const r = await fetch(`/api/v1/servers/${server.id}/join-requests`, { headers: { Authorization: `Bearer ${t}` } });
          if (!r.ok) return { serverId: server.id, serverName: server.display_name, requests: [] };
          const d = await r.json();
          return { serverId: server.id, serverName: server.display_name, requests: d.requests || [] };
        })
      );

      const map = {};
      results.forEach(({ serverId, serverName, requests }) => {
        map[serverId] = { serverName, requests };
      });
      setJoinRequests(map);
    } catch {
      // ignore
    } finally {
      setRequestsLoading(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'servers' && myServers.length === 0 && !serversLoading) fetchMyServers();
    if (tab === 'requests' && Object.keys(joinRequests).length === 0 && !requestsLoading) fetchJoinRequests();
  }

  async function handleApprove(serverId, requestId) {
    await fetch(`/api/v1/servers/${serverId}/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    setJoinRequests((prev) => ({
      ...prev,
      [serverId]: {
        ...prev[serverId],
        requests: prev[serverId].requests.filter((r) => r.id !== requestId),
      },
    }));
  }

  async function handleReject(serverId, requestId) {
    await fetch(`/api/v1/servers/${serverId}/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    });
    setJoinRequests((prev) => ({
      ...prev,
      [serverId]: {
        ...prev[serverId],
        requests: prev[serverId].requests.filter((r) => r.id !== requestId),
      },
    }));
  }

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  async function handleUpload(e) {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    try{
      setUploading(true);
      setError('');

      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit.');
        setUploading(false);
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}.${fileExt}`;

      const {error: uploadError} = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if(uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
      setSuccess('Avatar uploaded successfully!');

    } catch(err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally{
      setUploading(false);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username?.trim()) {
      setError('Username is required.');
      return;
    }

    if (username.length > 15) {
      setError('Username must be 15 characters or less.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        id: userId,
        username: username.trim(),
        interests: interests,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id', returning: 'representation' });

      if (updateError) throw updateError;

      await supabase.auth.updateUser({ data: { username: username.trim() } });

      setSuccess('Profile saved successfully.');
      setIsEditing(false);
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

  const totalPending = Object.values(joinRequests).reduce((acc, { requests }) => acc + requests.length, 0);

  return (
    <div className="mx-auto flex flex-col md:flex-row gap-4 max-w-[1400px] text-gray-900 p-4 pt-6 pb-4 h-[calc(100vh-20px)] overflow-hidden">
      <aside className="profile-left flex-wrap md:flex-nowrap w-full md:w-64 md:h-[calc(100vh-120px)] bg-[#6b3f10] rounded-3xl shadow-2xl p-6 border-2 border-[#4f310e]">

        {/* AVATAR BLOCK */}
        <div className="relative group cursor-pointer">
          <img
            src={avatarUrl || '/avatar-placeholder.png'}
            alt="avatar"
            className="w-full h-40 object-cover rounded-2xl border-4 border-[#d8c9a3] group-hover:opacity-75 transition-opacity"
            onClick={() => document.getElementById('avatar-upload').click()}
            onError={(ev) => {
              ev.currentTarget.onerror = null;
              ev.currentTarget.src = 'https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback';
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-tighter">
              Change Skin
            </span>
          </div>
          <input
            type="file"
            id="avatar-upload"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          {uploading && (
            <div className="absolute inset-0 bg-[#6b3f10]/70 flex items-center justify-center rounded-2xl">
              <div className="w-8 h-8 border-4 border-[#d8c9a3] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <span className="absolute top-2 left-2 px-3 py-1 bg-[#d6b98d] rounded-full text-xs font-semibold uppercase tracking-wider">
            Account Name
          </span>
        </div>

        <div className="mt-3 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wider text-[#f3e1b8]">{loading ? 'Loading...' : username}</h1>
          <p className={`text-[10px] mt-1 font-bold uppercase tracking-widest px-2 py-0.5 rounded-full inline-block ${isDev ? 'bg-red-600 text-white animate-pulse' : 'text-[#eee]'}`}>
            {isDev ? 'Minecraft Trading Admin' : 'Minecraft Trading Resident'}
          </p>
          {memberSince && <p className="text-[10px] text-[#d8c9a3] mt-1 italic">Member since {memberSince}</p>}
        </div>

        {/* My Servers in sidebar */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase text-[#d8c9a3] tracking-wider">My Servers</p>
          {serversLoading && <p className="text-xs text-[#ccc]">Loading...</p>}
          {!serversLoading && myServers.length === 0 && (
            <p className="text-xs text-[#ccc]">No servers yet</p>
          )}
          {myServers.map((server) => (
            <button
              key={server.id}
              type="button"
              onClick={() => router.push(`/home?serverId=${server.id}`)}
              className="w-full py-2 rounded-lg text-sm font-bold bg-[#fdf8e6] text-[#5b3f1d] border-2 border-[#d8c9a3] transition hover:bg-white"
            >
              {server.display_name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => router.push('/home')}
          className="mt-4 w-full py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all shadow-md text-sm font-bold"
        >
          Return to Hub
        </button>
      </aside>

      <section className="profile-right flex-1 bg-[#a16a1e] rounded-3xl shadow-2xl p-6 border-2 border-[#7f4e1f] md:h-[calc(100vh-120px)] flex flex-col">
        <div className="bg-[#d8c0a2] p-5 rounded-3xl h-full flex flex-col">

          {/* Tab bar */}
          <div className="flex gap-2 border-b border-[#b99f7d] pb-2 mb-4">
            {[
              { id: 'settings', label: 'Account Settings' },
              { id: 'servers', label: 'My Servers' },
              { id: 'requests', label: `Join Requests${totalPending > 0 ? ` (${totalPending})` : ''}` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`text-xs px-3 py-1 rounded-full font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-[#6b3f10] text-[#f3e1b8]'
                    : 'bg-[#c9ae8d] text-[#52331c] hover:bg-[#b99f7d]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Account Settings tab */}
          {activeTab === 'settings' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold tracking-wide text-[#52331c]">Account Settings</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs bg-[#6b3f10] text-[#f3e1b8] px-3 py-1 rounded-full font-bold hover:bg-[#4f310e] transition"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs uppercase text-[#43312a] font-bold">Username</span>
                    {isEditing ? (
                      <input
                        className="mt-1 rounded-lg border border-[#b99f7d] p-2 w-full text-sm bg-white"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    ) : (
                      <p className="mt-1 p-2 text-sm text-[#52331c] bg-[#e7d5b8]/50 rounded-lg">{username}</p>
                    )}
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase text-[#43312a] font-bold">Email</span>
                    <p className="mt-1 p-2 text-sm text-[#7d5a3c] bg-white/30 rounded-lg italic">{email}</p>
                  </label>
                </div>

                <div className="block">
                  <span className="text-xs uppercase text-[#43312a] font-bold">Trading Interests</span>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {MASTER_INTERESTS.map((item) => {
                        const isSelected = interests.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleInterest(item)}
                            className={`text-[10px] px-3 py-1 rounded-md font-bold uppercase transition-all border-2
                              ${isSelected
                                ? 'bg-[#6b3f10] text-[#f3e1b8] border-[#4f310e]'
                                : 'bg-[#d8c0a2] text-[#6b3f10] border-[#b99f7d] hover:bg-[#c9ae8d]'}`}
                          >
                            {item} {isSelected ? '✕' : '+'}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
                      {interests.length > 0 ? interests.map((tag, i) => (
                        <span key={i} className="bg-[#6b3f10] text-[#f3e1b8] text-[10px] px-2 py-1 rounded-md font-bold uppercase shadow-sm">
                          {tag}
                        </span>
                      )) : (
                        <p className="text-sm italic text-[#7d5a3c]">No interests selected...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="inventory-card bg-[#6f4321] rounded-2xl p-2">
                  <h3 className="text-xs font-semibold text-[#f0e0c5] mb-2">Inventory</h3>
                  <div className="grid grid-cols-6 gap-1">
                    {inventoryGrid.flat().map((cell) => (
                      <div
                        key={cell.id}
                        className={`h-6 rounded-md border ${cell.occupied ? 'bg-[#e7c17a] border-[#8d5d29]' : 'bg-[#bd8f4a] border-[#a67231]'}`}
                      />
                    ))}
                  </div>
                </div>

                {error && <p className="text-xs text-red-700 font-bold">{error}</p>}
                {success && <p className="text-green-800 text-xs font-semibold">{success}</p>}

                {isEditing && (
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all shadow-md text-sm font-bold" disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      className="flex-1 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-all shadow-md text-sm font-bold"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </>
          )}

          {/* My Servers tab */}
          {activeTab === 'servers' && (
            <div className="flex flex-col gap-3 overflow-y-auto flex-1">
              <h2 className="text-xl font-bold tracking-wide text-[#52331c]">My Servers</h2>
              {serversLoading && <p className="text-sm italic text-[#7d5a3c]">Loading servers...</p>}
              {!serversLoading && myServers.length === 0 && (
                <p className="text-sm italic text-[#7d5a3c]">You have not joined any servers yet.</p>
              )}
              {myServers.map((server) => (
                <div key={server.id} className="bg-[#c9ae8d] rounded-xl p-4 border border-[#b99f7d] flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-[#52331c]">{server.display_name}</p>
                    <p className="text-xs text-[#7d5a3c] mt-0.5">
                      {server.mc_version ? `v${server.mc_version} · ` : ''}
                      Owner: {server.profiles?.username || 'Unknown'}
                      {server.userPermission?.is_admin && (
                        <span className="ml-2 bg-[#6b3f10] text-[#f3e1b8] text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">Admin</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/home?serverId=${server.id}`)}
                    className="text-xs bg-[#6b3f10] text-[#f3e1b8] px-3 py-1 rounded-full font-bold hover:bg-[#4f310e] transition"
                  >
                    Browse
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Join Requests tab */}
          {activeTab === 'requests' && (
            <div className="flex flex-col gap-3 overflow-y-auto flex-1">
              <h2 className="text-xl font-bold tracking-wide text-[#52331c]">Join Requests</h2>
              {requestsLoading && <p className="text-sm italic text-[#7d5a3c]">Loading requests...</p>}
              {!requestsLoading && Object.values(joinRequests).every(({ requests }) => requests.length === 0) && (
                <p className="text-sm italic text-[#7d5a3c]">No pending join requests.</p>
              )}
              {Object.entries(joinRequests).map(([serverId, { serverName, requests }]) =>
                requests.length === 0 ? null : (
                  <div key={serverId}>
                    <p className="text-xs font-bold uppercase text-[#52331c] tracking-wider mb-2">{serverName}</p>
                    <div className="flex flex-col gap-2">
                      {requests.map((req) => (
                        <div key={req.id} className="bg-[#c9ae8d] rounded-xl p-3 border border-[#b99f7d] flex justify-between items-center">
                          <span className="text-sm font-bold text-[#52331c]">
                            {req.profiles?.username || req.profiles?.name || req.user_id?.slice(0, 8)}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(serverId, req.id)}
                              className="text-xs bg-green-700 text-white px-3 py-1 rounded-full font-bold hover:bg-green-800 transition"
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(serverId, req.id)}
                              className="text-xs bg-red-800 text-white px-3 py-1 rounded-full font-bold hover:bg-red-900 transition"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
