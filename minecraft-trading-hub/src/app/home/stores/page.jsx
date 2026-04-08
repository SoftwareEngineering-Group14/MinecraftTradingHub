import Stores from "../../components/Stores";
import { createServerSideClient } from '../../lib/supabaseServer';

export default async function StoresPage({ searchParams }) {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="card p-8 text-center">
          <p className="heading-pixel">Please log in to view stores.</p>
        </div>
      </div>
    );
  }

  // Get server IDs where user is member or owner
  const { data: permissions } = await supabase
    .from('server_permissions')
    .select('server_id')
    .eq('user_id', user.id)
    .eq('is_member', true);

  const { data: ownedServers } = await supabase
    .from('servers')
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_deleted', false);

  const serverIds = [
    ...(permissions || []).map(p => p.server_id),
    ...(ownedServers || []).map(s => s.id)
  ];

  if (serverIds.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Stores stores={[]} />
      </div>
    );
  }

  // Pagination
  const page = parseInt(searchParams?.get('page')) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const { data: stores = [], count } = await supabase
    .from('user_stores')
    .select('id,name,server_name,description,status', { count: 'exact' })
    .eq('status', 'active')
    .in('server_id', serverIds)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Stores stores={stores} currentPage={page} totalPages={totalPages} />
    </div>
  );
}