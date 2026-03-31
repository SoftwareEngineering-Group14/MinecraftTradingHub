import { createServerSideClient } from '../lib/supabaseServer';
import { redirect } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { ViewModeProvider } from '../contexts/ViewModeContext';

export default async function HomeLayout({ children }) {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const username = user.user_metadata?.username || 'Player';

  // ─── Admin check ───────────────────────────────────────────────────────────
  // TODO: Replace this placeholder with the real DB query once the admins
  // table is ready. Example:
  //
  //   const { data: adminRow } = await supabase
  //     .from('admins')           // or 'roles', 'user_roles', etc.
  //     .select('id')
  //     .eq('user_id', user.id)
  //     .maybeSingle();
  //   const isAdmin = !!adminRow;
  //
  const isAdmin = false; // ← wire up above query here
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <ViewModeProvider isAdmin={isAdmin}>
      <div className="mc-app-layout">
        <Sidebar username={username} isAdmin={isAdmin} />
        <main className="mc-main-content">
          {children}
        </main>
      </div>
    </ViewModeProvider>
  );
}
