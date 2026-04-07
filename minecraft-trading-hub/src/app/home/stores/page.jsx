import Stores from "../../components/Stores";
import { createServerSideClient } from '../../lib/supabaseServer';

export default async function StoresPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: stores = [] } = await supabase
    .from('user_stores')
    .select('id,name,server_name,description,status')
    .eq('status', 'active')
    .order('name', { ascending: true });

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Stores stores={stores} />
    </div>
  );
}