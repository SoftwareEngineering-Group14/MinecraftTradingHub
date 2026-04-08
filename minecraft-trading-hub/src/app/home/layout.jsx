import { createServerSideClient } from '../lib/supabaseServer';
import { redirect } from 'next/navigation';
import Link from 'next/link';
// AUTH LEAD: Corrected the typo in your import to match your filename
import LogOutForm from '../components/LogOutForm';

export default async function HomeLayout({ children }) {
  // 1. Use your new utility (handles the Next.js 16 async cookie requirement)
  const supabase = await createServerSideClient();
  // 2. Server-side session check
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Infrastructure Guard: Redirect if session is missing
  if (!user) {
    redirect('/signin');
  }

  const username = user.user_metadata?.username || "Player";

  // fetch coins and ban status from profiles table
  const { data: profileData } = await supabase
    .from('profiles')
    .select('coins, is_banned')
    .eq('id', user.id)
    .single();

  if (profileData?.is_banned) {
    redirect('/banned');
  }

  const coins = profileData?.coins ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Shared Navigation Header */}
      <header className="header">
        <div className="flex gap-4">
          <Link href="/home" className="hover:text-[#8fca5c] transition-colors">HUB</Link>
          <Link href="/home/profile" className="hover:text-[#8fca5c] transition-colors">PROFILE</Link>

        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-lg border border-[#8fca5c] bg-[#4e6a1d] text-xs text-white font-space-mono">
            {coins} 🪙
          </div>
          <Link href="/home/profile" className="hover:text-[#8fca5c] transition-colors">
            <span className="text-sm font-space-mono text-white cursor-pointer hover:text-[#8fca5c]/80 transition-colors">
              {username.toUpperCase()}
            </span>
          </Link>

          {/* AUTH LEAD FIX: Replaced the static Link with your functional Client Component */}
          <LogOutForm />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="page-container">
        {children}
      </main>
    </div>
  );
}