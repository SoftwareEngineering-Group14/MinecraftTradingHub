"use client";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseClient'; 

export default function ProfileForm() {
  const [username, setUsername] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push('/signin'); 
          return;
        }

        const playerTag = user.user_metadata?.username || "Unknown Player";
        
        setUsername(playerTag);
      } catch (err) {
        console.error("Error fetching player profile:", err);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [supabase, router]);

  return (
    <div className="flex flex-col gap-6 w-80">
      <div className="profile-header text-center">
        <h2 className="text-xl font-bold uppercase tracking-wider">
          {loading ? "FETCHING PLAYER..." : username}
        </h2>
        <p className="text-xs text-gray-400 font-mono mt-1">Trading Hub Resident</p>
      </div>
      
      <div className="flex flex-col gap-2 mt-4">
        <button 
          type='button'
          onClick={() => router.push('/home')} 
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
        >
          Return to Hub
        </button>

      </div>
    </div>
  );
}