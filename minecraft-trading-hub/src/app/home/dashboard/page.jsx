"use client";

import Link from 'next/link';
import { useViewMode } from '../../contexts/ViewModeContext';

const STORE_TYPES = {
  Redstone:     { bg: '#4a0000', accent: '#ff2222', text: '#ff8888', icon: '⚡' },
  Building:     { bg: '#3c2010', accent: '#c4a14a', text: '#e8cc88', icon: '🧱' },
  PvP:          { bg: '#4a1000', accent: '#ff6600', text: '#ffaa60', icon: '⚔️' },
  Farming:      { bg: '#0f2d00', accent: '#5D8A2C', text: '#8BC34A', icon: '🌾' },
  Trading:      { bg: '#3a2e00', accent: '#FFD700', text: '#ffe860', icon: '💰' },
  'Rare Items': { bg: '#280040', accent: '#9B59B6', text: '#c388db', icon: '💎' },
  Hardcore:     { bg: '#0a0a0a', accent: '#888888', text: '#cccccc', icon: '💀' },
  Creative:     { bg: '#002040', accent: '#3498DB', text: '#70b8ec', icon: '🎨' },
};

const FILLER_LISTINGS = [
  { id:  1, name: 'Diamond Emporium',  server: 'SurvivalCraft',  creator: 'Steve_Builder',  type: 'Trading',    created: '3 days ago',  updated: '2h ago'  },
  { id:  2, name: 'Redstone Depot',    server: 'Redtech SMP',    creator: 'PistonPro99',    type: 'Redstone',   created: '5 days ago',  updated: '1d ago'  },
  { id:  3, name: 'The Pig Farm',      server: 'FarmLife MC',    creator: 'FarmerJoe42',    type: 'Farming',    created: '1 week ago',  updated: '6h ago'  },
  { id:  4, name: 'PvP Arsenal',       server: 'BattleMC',       creator: 'SwordMaster_X',  type: 'PvP',        created: '2 days ago',  updated: '30m ago' },
  { id:  5, name: 'Creative Corner',   server: 'BuildCraft Pro', creator: 'PixelArtist',    type: 'Creative',   created: '4 days ago',  updated: '3h ago'  },
  { id:  6, name: 'Rare Finds Shop',   server: 'VaultMC',        creator: 'TreasureHuntr',  type: 'Rare Items', created: '10 days ago', updated: '2d ago'  },
  { id:  7, name: 'Build Supply Co.',  server: 'MegaBuild',      creator: 'ArchitectXL',    type: 'Building',   created: '6 days ago',  updated: '12h ago' },
  { id:  8, name: 'Hardcore Hut',      server: 'HardCore SMP',   creator: 'SurvivorPro1',   type: 'Hardcore',   created: '2 weeks ago', updated: '4d ago'  },
  { id:  9, name: 'Farm Fresh',        server: 'HarvestMC',      creator: 'CropKing2024',   type: 'Farming',    created: '1 day ago',   updated: '45m ago' },
  { id: 10, name: 'Iron Fortress',     server: 'War Games',      creator: 'BlackSmith99',   type: 'PvP',        created: '8 days ago',  updated: '5h ago'  },
  { id: 11, name: 'Enchant Palace',    server: 'Magic Realm',    creator: 'WizardSteve',    type: 'Rare Items', created: '3 weeks ago', updated: '1d ago'  },
  { id: 12, name: 'Stone Works',       server: 'StoneCraft',     creator: 'MasonRock',      type: 'Building',   created: '12 days ago', updated: '8h ago'  },
];

function ListingCard({ listing, isAdminView }) {
  const style = STORE_TYPES[listing.type] || STORE_TYPES.Trading;

  return (
    <div className="mc-listing-card" style={{ position: 'relative' }}>

      {/* Admin delete — sits above the link, top-right corner */}
      {isAdminView && (
        <button
          className="mc-admin-delete-btn"
          title="Delete listing"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
        >
          ✕
        </button>
      )}

      {/* Entire card is a link to the store page */}
      <Link href={`/home/store/${listing.id}`} className="block" style={{ textDecoration: 'none', color: 'inherit' }}>

        {/* ── Store image / icon block ── */}
        <div className="mc-card-image" style={{ backgroundColor: style.bg }}>
          <span style={{ fontSize: '44px', position: 'relative', zIndex: 1 }}>
            {style.icon}
          </span>
        </div>

        {/* ── Info ── */}
        <div className="mc-card-info">
          {/* Store name — cream white, high contrast */}
          <p className="font-press-start text-[9px] leading-relaxed mb-3" style={{ color: '#FFF0D0' }}>
            {listing.name}
          </p>

          {/* Server — clickable, warm cream */}
          <div className="mb-1 flex items-center gap-1">
            <span className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>🌐</span>
            <button
              className="mc-clickable-tag"
              onClick={(e) => e.preventDefault()}
            >
              {listing.server}
            </button>
          </div>

          {/* Creator — clickable, warm cream */}
          <div className="mb-3 flex items-center gap-1">
            <span className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>👤</span>
            <button
              className="mc-clickable-tag"
              onClick={(e) => e.preventDefault()}
            >
              {listing.creator}
            </button>
          </div>

          {/* Type badge */}
          <span
            className="mc-type-badge"
            style={{ backgroundColor: style.bg, color: style.text, borderColor: style.accent }}
          >
            {listing.type}
          </span>

          {/* Timestamps — muted tan, clearly readable */}
          <div className="mc-card-timestamps">
            <p className="font-space-mono text-[8px]" style={{ color: '#E8C888' }}>
              📅 {listing.created}
            </p>
            <p className="font-space-mono text-[8px] mt-1" style={{ color: '#E8C888' }}>
              🔄 {listing.updated}
            </p>
          </div>
        </div>

      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { isAdminView } = useViewMode();

  return (
    <div>
      {/* ── Header ── */}
      <div className="mc-dashboard-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-press-start text-sm text-green-400 mb-2">
              ⛏ Recent Listings
            </h1>
            <p className="font-space-mono text-[10px] uppercase tracking-widest" style={{ color: '#C4904A' }}>
              Browse the latest stores from across all servers
            </p>
          </div>

          {isAdminView && (
            <div
              className="flex items-center gap-2 px-3 py-2 border-2 border-yellow-600"
              style={{ backgroundColor: '#3A2800', boxShadow: '2px 2px 0 #000' }}
            >
              <span className="font-press-start text-[7px] text-yellow-400">⚡ ADMIN MODE</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="mc-listings-grid">
        {FILLER_LISTINGS.map((listing) => (
          <ListingCard key={listing.id} listing={listing} isAdminView={isAdminView} />
        ))}
      </div>
    </div>
  );
}
