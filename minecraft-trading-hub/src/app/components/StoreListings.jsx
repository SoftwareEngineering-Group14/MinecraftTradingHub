'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function StoreListings({ store, listings, listingItems, itemMeta }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 12;

  const itemsByListing = listingItems.reduce((acc, item) => {
    acc[item.listing_id] = acc[item.listing_id] || [];
    acc[item.listing_id].push(item);
    return acc;
  }, {});

  const itemMap = itemMeta.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const normalizedQuery = searchQuery.trim().toLowerCase();

  let listingCards = listings.map((listing) => ({
    listing,
    items: itemsByListing[listing.id] || [],
  }));

  // Filter based on search query
  if (normalizedQuery) {
    listingCards = listingCards.filter(({ listing, items }) => {
      const listingText = [
        listing.id,
        listing.name,
        listing.description,
        listing.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const itemsText = items
        .map((item) => [
          itemMap[item.item_id]?.name,
          item.cost,
          item.quantity,
        ]
          .filter(Boolean)
          .join(' '))
        .join(' ')
        .toLowerCase();

      return listingText.includes(normalizedQuery) || itemsText.includes(normalizedQuery);
    });
  }

  // Pagination
  const totalPages = Math.ceil(listingCards.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentListings = listingCards.slice(startIndex, endIndex);

  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-[#5c3b1c] text-white">
      <div className="page-container flex-col items-start gap-6 p-6 md:p-10">
        <div className="flex w-full flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="heading-pixel text-3xl">
              {store.name || store.server_name || 'Store Listings'}
            </h1>
            <div className="mt-2 flex flex-col gap-2 text-sm text-[#d8d8d8] max-w-2xl">
              <p>{store.description || 'Browse all available listings from this store.'}</p>
              {store.server_name ? (
                <p className="uppercase tracking-[0.2em] text-[#a8b293]">Server: {store.server_name}</p>
              ) : null}
              <p className="uppercase tracking-[0.2em] text-[#a8b293]">Store ID: {store.id}</p>
            </div>
          </div>

          <Link href="/home/stores" className="green-button whitespace-nowrap">
            Back to Stores
          </Link>
        </div>

        <div className="w-full bg-[#5c3b1c] p-4 rounded-xl border border-[#8fca5c]/20 shadow-lg flex justify-center">
          <div className="w-full md:w-[65%]">
            <input
              type="text"
              placeholder="Search listings, items, or costs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="auth-input w-full bg-[#2f2a1c] border-[#8fca5c]/40 text-white placeholder:text-[#b7b7b7]"
            />
          </div>
        </div>

        {currentListings.length === 0 ? (
          <div className="card w-full p-8 bg-[#3d2a18] border border-[#8fca5c]/20">
            <p className="heading-pixel">No listings available.</p>
            <p className="mt-3 text-sm text-[#d8d8d8]">
              Listings will appear here once they are created.
            </p>
          </div>
        ) : (
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {currentListings.map(({ listing, items }) => (
              <div key={listing.id} className="card p-4 bg-[#503a1f] border border-[#8fca5c]/20 shadow-lg">
                <div className="rounded-xl bg-[#0f0d08] p-4">
                  <div className="mb-3 text-xs uppercase tracking-[0.2em] text-[#a8b293]">
                    Listing #{listing.id}
                  </div>
                  <div className="text-sm text-[#d8d8d8] mb-3 truncate">
                    {listing.description || 'No listing description'}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#a8b293] mb-3">
                    Item count: {items.length}
                  </div>
                  {items.length > 0 ? (
                    <div className="rounded-lg border border-[#8fca5c]/20 bg-[#1f1b12] p-3 space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-space-mono text-sm text-[#cfd8c1]">
                              {itemMap[item.item_id]?.name || `Item ${item.item_id}`}
                            </p>
                            <p className="text-xs text-[#a8b293] mt-1">Qty: {item.quantity ?? 0}</p>
                          </div>
                          <div className="text-sm font-bold text-[#8fca5c]">{item.cost ?? 0} 🪙</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-[#d8d8d8]">No items attached to this listing yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {listingCards.length > 0 ? (
          <div className="w-full flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 text-xs text-[#d8d8d8]">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="green-button px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    page === currentPage ? 'bg-[#8fca5c] text-[#1f1f1f]' : 'bg-[#3b2f1d] hover:bg-[#4a3d2a]'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="green-button px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
