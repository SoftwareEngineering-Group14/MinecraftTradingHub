import { redirect } from 'next/navigation';
import { createServerSideClient } from '../../../lib/supabaseServer';
import UsernameForm from './UsernameForm';

export default async function UsernamePage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  if (user.user_metadata?.username) {
    redirect('/onboarding/interests');
  }

  return <UsernameForm />;
}