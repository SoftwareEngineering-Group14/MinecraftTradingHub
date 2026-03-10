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

        <div className="card-container">
          <div className="card">
            <h2 className="text-xl font-bold uppercase tracking-wider">
              {loading ? "FETCHING PLAYER..." : username}
            </h2>
            <p className="text-xs text-white font-mono mt-1">Trading Hub Resident</p>
        
      
            <div className="flex flex-col gap-2 mt-4">
              <button 
                type='button'
                onClick={() => router.push('/home')} 
                className="green-button w-full text-center"
              >
                Return to Hub
              </button>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}