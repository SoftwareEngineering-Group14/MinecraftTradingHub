"use client";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Stores({ stores = [], currentPage = 1, totalPages = 1 }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/home/stores?${params.toString()}`);
  };

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
            Join a server and open a store first, then return here to view listings for each store.
          </p>
        </div>
      ) : (
        <>
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

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                className="green-button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`px-3 py-1 text-sm border rounded ${
                      page === currentPage
                        ? 'bg-[#8fca5c] text-black border-[#8fca5c]'
                        : 'bg-[#8a5a2a] text-[#d8d8d8] border-[#61371f] hover:bg-[#61371f]'
                    }`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                className="green-button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}