'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabaseClient';

export default function StoreListings({ store, serverId, canCreateListings, listings: initialListings, listingItems: initialListingItems, itemMeta: initialItemMeta }) {
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newCost, setNewCost] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [listings, setListings] = useState(initialListings || []);
  const [listingItems, setListingItems] = useState(initialListingItems || []);
  const [itemMeta, setItemMeta] = useState(initialItemMeta || []);
  const [purchasing, setPurchasing] = useState(null);
  const [purchaseMsg, setPurchaseMsg] = useState('');
  const [buyQuantities, setBuyQuantities] = useState({});
  const itemsPerPage = 12;

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    setListings(initialListings || []);
    setListingItems(initialListingItems || []);
    setItemMeta(initialItemMeta || []);
  }, [initialListings, initialListingItems, initialItemMeta]);

  async function createListing() {
    if (!token || !serverId || !store?.id || !newItemName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch(`/api/v1/${serverId}/stores/${store.id}/items`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          quantity: newQuantity ? parseInt(newQuantity, 10) : null,
          cost: newCost ? parseInt(newCost, 10) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Create listing error', data.error);
        return;
      }

      if (data.listing) {
        setListings((prev) => [...prev, data.listing]);
        setListingItems((prev) => [...prev, ...(data.listing.listing_items || [])]);
        const newItem = data.listing.listing_items?.map((item) => item.item).filter(Boolean) || [];
        setItemMeta((prev) => [...prev, ...newItem]);
        setNewItemName('');
        setNewQuantity('');
        setNewCost('');
      }
    } catch (err) {
      console.error('Create listing failed', err);
    } finally {
      setCreating(false);
    }
  }

  async function handlePurchase(listingId, quantity) {
    if (!token || !serverId || !store?.id) return;
    setPurchasing(listingId);
    setPurchaseMsg('');
    try {
      const res = await fetch(`/api/v1/${serverId}/stores/${store.id}/items/${listingId}/purchase`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPurchaseMsg(data.error || 'Purchase failed');
        return;
      }
      if (data.listingDeleted) {
        setListings((prev) => prev.filter((l) => l.id !== listingId));
        setListingItems((prev) => prev.filter((li) => li.listing_id !== listingId));
      } else {
        // Update the remaining quantity in state
        setListingItems((prev) =>
          prev.map((li) =>
            li.listing_id === listingId
              ? { ...li, quantity: (li.quantity ?? 0) - quantity }
              : li
          )
        );
      }
      setBuyQuantities((prev) => ({ ...prev, [listingId]: 1 }));
      window.dispatchEvent(new CustomEvent('coinBalanceUpdated', { detail: { newBalance: data.newBalance } }));
      setPurchaseMsg(`Purchased ${quantity}x! Spent ${data.coinsSpent} 🪙. New balance: ${data.newBalance} 🪙`);
    } catch {
      setPurchaseMsg('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  }

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

          <Link href={`/home/servers/${serverId}`} className="green-button whitespace-nowrap">
            Back to Stores
          </Link>
        </div>

        {purchaseMsg && (
          <div className={`w-full p-3 rounded-lg text-sm font-space-mono ${purchaseMsg.startsWith('Purchased') ? 'bg-[#2a4a1a] text-[#8fca5c]' : 'bg-[#4a1a1a] text-[#ff8888]'}`}>
            {purchaseMsg}
          </div>
        )}

        <div className="w-full bg-[#5c3b1c] p-4 rounded-xl border border-[#8fca5c]/20 shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
          {canCreateListings && (
            <button
              className="green-button w-full md:w-[30%]"
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm ? 'Hide Create' : 'Create Listing'}
            </button>
          )}
        </div>

        <div className="w-full flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex-1">
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
                  <div 
                    key={listing.id} 
                    className="
                      bg-[url('/minecraft_sign.jpg')] 
                      bg-cover 
                      bg-center 
                      p-4 
                      border-4 
                      border-[#3b2511] 
                      shadow-[0_10px_15px_-3px_rgba(0,0,0,0.7)] 
                      rounded-md
                    "
                  >
                    <div className="rounded-xl bg-black/40 p-4">
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
                                <p className="text-xs text-[#a8b293] mt-1">Stock: {item.quantity ?? 0}</p>
                              </div>
                              <div className="text-sm font-bold text-[#8fca5c]">{item.cost ?? 0} 🪙 / unit</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-[#d8d8d8]">No items attached to this listing yet.</div>
                      )}

                      {currentUserId && store.owner_id !== currentUserId && items.length > 0 && (() => {
                        const maxQty = Math.min(...items.map((i) => i.quantity ?? 1));
                        const unitCost = items.reduce((s, i) => s + (i.cost ?? 0), 0);
                        const selectedQty = buyQuantities[listing.id] ?? 1;
                        const totalCost = selectedQty * unitCost;
                        return (
                          <div className="mt-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-[#a8b293] whitespace-nowrap">Qty:</label>
                              <input
                                type="number"
                                min={1}
                                max={maxQty}
                                value={selectedQty}
                                onChange={(e) => {
                                  const v = Math.max(1, Math.min(maxQty, parseInt(e.target.value, 10) || 1));
                                  setBuyQuantities((prev) => ({ ...prev, [listing.id]: v }));
                                }}
                                className="auth-input w-full bg-[#2f2a1c] border-[#8fca5c]/40 text-white text-sm py-1"
                              />
                            </div>
                            <button
                              className="green-button w-full"
                              disabled={purchasing === listing.id}
                              onClick={() => handlePurchase(listing.id, selectedQty)}
                            >
                              {purchasing === listing.id ? 'Buying...' : `Buy ${selectedQty}x for ${totalCost} 🪙`}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canCreateListings && showCreateForm && (
            <aside className="w-full xl:w-80 flex-shrink-0 bg-[#3b2f1d] rounded-3xl border border-[#8fca5c]/20 p-6 shadow-xl">
              <h2 className="heading-pixel text-lg mb-4">New Listing</h2>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="auth-input w-full bg-[#2f2a1c] border-[#8fca5c]/40 text-white placeholder:text-[#b7b7b7]"
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  className="auth-input w-full bg-[#2f2a1c] border-[#8fca5c]/40 text-white placeholder:text-[#b7b7b7]"
                />
                <input
                  type="number"
                  placeholder="Cost"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="auth-input w-full bg-[#2f2a1c] border-[#8fca5c]/40 text-white placeholder:text-[#b7b7b7]"
                />
                <button
                  className="green-button w-full"
                  disabled={creating || !newItemName.trim()}
                  onClick={createListing}
                >
                  {creating ? 'Creating...' : 'Create Listing'}
                </button>
              </div>
            </aside>
          )}
        </div>

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
