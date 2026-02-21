import { redirect } from 'next/navigation';
import { createServerSideClient } from '../lib/supabaseClient';

export default async function AuthLayout({ children }) {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}
