import { redirect } from 'next/navigation';
import { createServerSideClient } from '../../lib/supabaseClient';

export default async function OnboardingLayout({ children }) {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasUsername = !!user.user_metadata?.username;
  const hasInterests = Array.isArray(user.user_metadata?.interests) && user.user_metadata.interests.length > 0;

  // Fully onboarded — no reason to be here
  if (hasUsername && hasInterests) {
    redirect('/');
  }

  return <>{children}</>;
}
