import { redirect } from 'next/navigation';
import { createServerSideClient } from '../../../lib/supabaseClient';
import UsernameForm from './UsernameForm';

export default async function UsernamePage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  if (user.user_metadata?.username) {
    redirect('/onboarding/interests');
  }

  return <UsernameForm />;
}