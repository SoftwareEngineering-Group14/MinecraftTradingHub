"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Stores({ stores = [] }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 min-h-screen px-4 py-8 sm:px-8">
      <div className="flex flex-row items-center justify-between gap-4 mb-4">
        <button className="green-button" onClick={() => router.push('/home/dashboard')}>
          Back
        </button>
        <h1 className="heading-pixel text-center">Stores</h1>
      </div>

      {stores.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="heading-pixel">No stores found.</p>
          <p className="mt-2 text-sm text-[#d8d8d8]">
            Open a store first, then return here to view listings for each store.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/home/stores/${store.id}`}
              className="card p-6 border border-[#8fca5c]/30 hover:border-[#8fca5c] transition-colors"
            >
              <h2 className="heading-pixel text-xl">{store.name || store.server_name || 'Store'}</h2>
              {store.server_name ? (
                <p className="text-xs uppercase tracking-[0.2em] text-[#a8b293] mt-2">Server: {store.server_name}</p>
              ) : null}
              {store.description ? (
                <p className="text-sm text-[#d8d8d8] mt-2">{store.description}</p>
              ) : (
                <p className="text-sm text-[#d8d8d8] mt-2">No description available.</p>
              )}
              <p className="mt-3 text-xs text-[#a8b293] truncate">ID: {store.id || 'missing'}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#a8b293]">
                View listings
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}