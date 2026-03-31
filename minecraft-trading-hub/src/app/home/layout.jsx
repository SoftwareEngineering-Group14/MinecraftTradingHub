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

  // Pull username, role, and developer flag from the profiles table (source of truth)
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, is_developer')
    .eq('id', user.id)
    .maybeSingle();

  const username = profile?.username || user.user_metadata?.username || 'Player';
  const isDeveloper = profile?.is_developer ?? user.user_metadata?.is_developer ?? false;

  return (
    <ViewModeProvider isAdmin={isDeveloper}>
      <div className="mc-app-layout">
        <Sidebar username={username} isAdmin={isDeveloper} />
        <main className="mc-main-content">
          {children}
        </main>
      </div>
    </ViewModeProvider>
  );
}
