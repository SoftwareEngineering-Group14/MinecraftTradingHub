import { redirect } from 'next/navigation';
import { createServerSideClient } from '../../../lib/supabaseClient';
import InterestsForm from './InterestsForm';

export default async function InterestsPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Must complete username step first
  if (!user.user_metadata?.username) {
    redirect('/onboarding/username');
  }

  return <InterestsForm />;
}
