import Link from 'next/link';
import { createServerSideClient } from '../../../lib/supabaseServer';
import StoreListings from '../../../components/StoreListings';

export default async function StorePage({ params }) {
  const { storeId } = await params;
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#5c3b1c] text-white">
        <div className="card p-8 max-w-xl text-center">
          <h1 className="heading-pixel">Not signed in</h1>
          <p className="mt-3 text-sm text-[#d8d8d8]">
            You need to sign in to view store listings.
          </p>
          <Link href="/signin" className="green-button mt-6 inline-block">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const { data: store, error: storeError } = await supabase
    .from('user_stores')
    .select('id,name,server_name,description,status')
    .eq('id', storeId)
    .eq('status', 'active')
    .single();

  if (storeError || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#5c3b1c] text-white">
        <div className="card p-8 max-w-xl text-center">
          <h1 className="heading-pixel">Store not found</h1>
          <p className="mt-3 text-sm text-[#d8d8d8]">
            We couldn't find an active store with ID <strong>{storeId || '(empty)'}</strong>.
          </p>
          <p className="mt-3 text-xs text-[#a8b293] break-all">
            Route params: {JSON.stringify(params)}
          </p>
          <Link href="/home/stores" className="green-button mt-6 inline-block">
            Back to Stores
          </Link>
        </div>
      </div>
    );
  }

  const listingsResult = await supabase
    .from('listings')
    .select('id,store_id')
    .eq('store_id', storeId);

  const listings = listingsResult.data || [];
  const listingsError = listingsResult.error;

  if (listingsError && listingsError.message) {
    console.error('Error fetching listings:', listingsError);
  }

  // Debug: check total listings count
  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });

  console.log('Total listings in database:', totalListings);

  const listingIds = listings.map((listing) => listing.id).filter(Boolean);
  const listingItemsResult = listingIds.length > 0
    ? await supabase
        .from('listing_items')
        .select('id,listing_id,item_id,quantity,cost')
        .in('listing_id', listingIds)
    : { data: [] };

  const listingItems = listingItemsResult.data || [];
  const listingItemsError = listingItemsResult.error;

  if (listingItemsError) {
    console.error('Error fetching listing items:', listingItemsError);
  }

  const itemIds = listingItems.map((item) => item.item_id).filter(Boolean);
  const itemMetaResult = itemIds.length > 0
    ? await supabase
        .from('item')
        .select('id,name')
        .in('id', itemIds)
    : { data: [] };

  const itemMeta = itemMetaResult.data || [];
  const itemMetaError = itemMetaResult.error;

  if (itemMetaError) {
    console.error('Error fetching item meta:', itemMetaError);
  }

  console.log('Store page data:', { storeId, listings, listingItems, itemMeta });

  return (
    <StoreListings
      store={store}
      listings={listings}
      listingItems={listingItems}
      itemMeta={itemMeta}
    />
  );
}
