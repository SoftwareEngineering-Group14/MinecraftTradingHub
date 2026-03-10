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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Shared Navigation Header */}
      <header className="header">
        <div className="flex gap-4">
          <Link href="/home" className="hover:text-blue-400 font-bold transition-colors">HUB</Link>
          <Link href="/home/profile" className="hover:text-blue-400 transition-colors">PROFILE</Link>
          <Link href="/home/dashboard" className="hover:text-blue-400 transition-colors">DASHBOARD</Link>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm font-space-mono text-green-400">
            {username.toUpperCase()}
          </span>
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