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
      className="mc-logout-btn"
    >
      ⬛ Logout
    </button>
  );
}