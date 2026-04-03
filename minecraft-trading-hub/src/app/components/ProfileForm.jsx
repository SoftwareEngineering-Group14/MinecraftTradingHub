"use client";

import { useEffect, useState } from "react"

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
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState([]); 
  const [avatarUrl, setAvatarUrl] = useState('');
  const [memberSince, setMemberSince] = useState('');

  const [userServers, setUserServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState([]); 
  const [avatarUrl, setAvatarUrl] = useState('');
  const [memberSince, setMemberSince] = useState('');

  const [userServers, setUserServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState(null);

  const router = useRouter();



  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      setError('');

      setLoading(true);
      setError('');

      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
          router.push('/signin');
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
          router.push('/signin');
          return;
        }

        const user = userData.user;
        setUserId(user.id);
        setEmail(user.email || '');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, name, is_developer, interests')
          .eq('id', user.id)
          .single();
        setIsDev(profile?.is_developer || false);
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

        const backupAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile?.username || user.user_metadata?.username || 'New Player'}`;

        setUsername(profile?.username || user.user_metadata?.username || 'New Player');
        setAvatarUrl(`${storageData?.publicUrl}?t=${Date.now()}`);
        // Fetch user's servers from user_stores table with server details
        const { data: stores, error: storesError } = await supabase
          .from('user_stores')
          .select('id, server_id, servers(id, name)')
          .eq('user_id', user.id);

        if (!storesError && stores && stores.length > 0) {
          setUserServers(stores);
          setSelectedServerId(stores[0].server_id);
        }
        const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });
        setMemberSince(joinDate);
        const user = userData.user;
        setUserId(user.id);
        setEmail(user.email || '');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username, name, is_developer, interests')
          .eq('id', user.id)
          .single();
        setIsDev(profile?.is_developer || false);
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

        const backupAvatar = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile?.username || user.user_metadata?.username || 'New Player'}`;

        setUsername(profile?.username || user.user_metadata?.username || 'New Player');
        setAvatarUrl(`${storageData?.publicUrl}?t=${Date.now()}`);
        // Fetch user's servers from user_stores table with server details
        const { data: stores, error: storesError } = await supabase
          .from('user_stores')
          .select('id, server_id, servers(id, name)')
          .eq('user_id', user.id);

        if (!storesError && stores && stores.length > 0) {
          setUserServers(stores);
          setSelectedServerId(stores[0].server_id);
        }
        const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });
        setMemberSince(joinDate);
      } catch (err) {
        console.error('Error fetching player profile:', err);
        setError('Could not load profile. Please refresh.');
        console.error('Error fetching player profile:', err);
        setError('Could not load profile. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [router]);

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
        interests: interests,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id', returning: 'representation' });

      if (updateError) throw updateError;

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

  return (
    <div className="mx-auto flex flex-col md:flex-row gap-4 max-w-[1400px] text-gray-900 p-4 pt-6 pb-4 h-[calc(100vh-20px)] overflow-hidden">
      <aside className="profile-left flex-wrap md:flex-nowrap w-full md:w-64 md:h-[calc(100vh-120px)] bg-[#6b3f10] rounded-3xl shadow-2xl p-6 border-2 border-[#4f310e]">
        
        {/* AVATAR BLOCK */}
        <div className="relative group cursor-pointer">
          <img
            src={avatarUrl || 'https://api.dicebear.com/7.x/pixel-art/svg?seed=fallback'}
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

        <section className="profile-right flex-1 bg-[#a16a1e] rounded-3xl shadow-2xl p-6 border-2 border-[#7f4e1f] md:h-[calc(100vh-120px)] flex flex-col">        
          <div className="bg-[#d8c0a2] p-5 rounded-3xl h-full">
          <div className="flex justify-between items-center border-b border-[#b99f7d] pb-2 mb-4">
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
                <p className="mt-1 p-2 text-sm text-[#52331c] bg-[#e7d5b8]/50 rounded-lg border border-dashed border-[#b99f7d]">
                  {username} <span className="text-[9px] opacity-50 ml-1"></span>
                </p>
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
        </div>
      </section>
    </div>
  );
}