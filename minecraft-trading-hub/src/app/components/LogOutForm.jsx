"use client";

import { createClient } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    
    router.refresh(); 

    window.location.href = '/signin';
  };

  return (
    <button 
      onClick={handleLogout}
      className="text-xs bg-red-600 px-3 py-1 rounded font-bold hover:bg-red-700 transition-colors uppercase"
    >
      Logout
    </button>
  );
}