"use client";

import { useState } from 'react';

/* ── Filler store data ── */
const FILLER_STORE = {
  name:        'Diamond Emporium',
  owner:       'Steve_Builder',
  server:      'SurvivalCraft',
  type:        'Trading',
  status:      'Open',
  created:     '3 months ago',
  description: 'The finest trading post in all of SurvivalCraft. Specialising in rare diamonds, emeralds, and high-tier enchanted gear.',
  typeStyle:   { bg: '#3a2e00', accent: '#FFD700', text: '#ffe860', icon: '💰' },
};

const FILLER_ITEMS = [
  {
    id: 1,  name: 'Diamond Sword',
    icon: '⚔️',  color: '#1488C8',  darkBg: '#0A3A6A',
    listed: '2 days ago',   cost: '64 Gold Ingots',
    qty: 3,   tradeType: 'Selling',
    enchant: 'Sharpness V · Unbreaking III · Looting II',
    notes: 'Top-tier combat weapon. Freshly enchanted and ready for battle.',
  },
  {
    id: 2,  name: 'Power V Bow',
    icon: '🏹',  color: '#8B5A2B',  darkBg: '#4A2810',
    listed: '3 days ago',   cost: '32 Emeralds',
    qty: 5,   tradeType: 'Selling',
    enchant: 'Power V · Infinity I · Flame I · Punch II',
    notes: 'Shoots flaming arrows. Infinity means you only ever need one arrow.',
  },
  {
    id: 3,  name: 'Netherite Pickaxe',
    icon: '⛏️',  color: '#4A3728',  darkBg: '#1A1210',
    listed: '5 days ago',   cost: '128 Iron Ingots',
    qty: 1,   tradeType: 'Selling',
    enchant: 'Efficiency V · Fortune III · Unbreaking III',
    notes: 'Max-level fortune — essential for bulk diamond and ancient debris mining.',
  },
  {
    id: 4,  name: 'Stack of Diamonds',
    icon: '💎',  color: '#1EAAF1',  darkBg: '#0A5A8A',
    listed: '1 day ago',    cost: '16 Emeralds',
    qty: 10,  tradeType: 'Selling',
    enchant: 'None',
    notes: 'Bulk diamonds ready for crafting netherite gear or high-tier trades.',
  },
  {
    id: 5,  name: 'Elytra',
    icon: '🦋',  color: '#8A2BE2',  darkBg: '#3A1060',
    listed: '1 week ago',   cost: '256 Gold Ingots',
    qty: 1,   tradeType: 'Selling',
    enchant: 'Unbreaking III · Mending',
    notes: 'Fully repaired with Mending applied. Fly across the overworld in style.',
  },
  {
    id: 6,  name: 'Shulker Box',
    icon: '📦',  color: '#7B4A9E',  darkBg: '#3A1A5A',
    listed: '4 days ago',   cost: '48 Emeralds',
    qty: 8,   tradeType: 'Selling',
    enchant: 'None',
    notes: 'Portable storage containers. Multiple colours available on request.',
  },
  {
    id: 7,  name: 'Trident',
    icon: '🔱',  color: '#00B4D8',  darkBg: '#004A6A',
    listed: '6 days ago',   cost: '96 Iron Ingots',
    qty: 2,   tradeType: 'Selling',
    enchant: 'Riptide III · Loyalty III · Channeling',
    notes: 'Extremely rare ocean drop. Three powerful enchantments pre-applied.',
  },
  {
    id: 8,  name: 'Beacon',
    icon: '🌟',  color: '#7FFFD4',  darkBg: '#1A6A5A',
    listed: '2 weeks ago',  cost: '512 Iron Ingots',
    qty: 1,   tradeType: 'Selling',
    enchant: 'None',
    notes: 'Full beacon setup ready to place. Wither Skeleton skull included in price.',
  },
  {
    id: 9,  name: 'Mending Book',
    icon: '📚',  color: '#C4A14A',  darkBg: '#5A4010',
    listed: '3 days ago',   cost: '64 Emeralds',
    qty: 6,   tradeType: 'Selling',
    enchant: 'Mending I',
    notes: 'One of the most sought-after enchantments. Apply to any tool or armour.',
  },
  {
    id: 10, name: 'Wither Skull',
    icon: '💀',  color: '#444444',  darkBg: '#0A0A0A',
    listed: '1 week ago',   cost: '128 Gold Ingots',
    qty: 3,   tradeType: 'Selling',
    enchant: 'None',
    notes: 'Required to summon the Wither. Sourced directly from the Nether Fortress.',
  },
  {
    id: 11, name: 'Totem of Undying',
    icon: '🏺',  color: '#DAA520',  darkBg: '#5A4000',
    listed: '5 days ago',   cost: '96 Emeralds',
    qty: 4,   tradeType: 'Selling',
    enchant: 'None',
    notes: 'Grants a second life when held in hand. Essential for end-game raids.',
  },
  {
    id: 12, name: 'Nether Star',
    icon: '⭐',  color: '#D8D8D8',  darkBg: '#5A5A5A',
    listed: '3 weeks ago',  cost: '1024 Iron Ingots',
    qty: 1,   tradeType: 'Selling',
    enchant: 'None',
    notes: 'Used to craft a Beacon. Only dropped by the Wither boss. Extremely rare.',
  },
];

/* ── Item card (left scroll list) ── */
function ItemCard({ item, selected, onSelect }) {
  return (
    <div
      className={`mc-item-card ${selected ? 'mc-item-card-selected' : ''}`}
      onClick={() => onSelect(item)}
    >
      {/* Block image */}
      <div className="mc-item-card-img" style={{ backgroundColor: item.color }}>
        <span style={{ fontSize: '30px', position: 'relative', zIndex: 1 }}>
          {item.icon}
        </span>
      </div>

      {/* Info */}
      <div className="mc-item-card-info">
        <p className="font-press-start text-[8px] leading-relaxed" style={{ color: '#FFF0D0' }}>
          {item.name}
        </p>
        <p className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>
          📅 {item.listed}
        </p>
        <p className="font-space-mono text-[9px] font-bold" style={{ color: '#FFD700' }}>
          💰 {item.cost}
        </p>
      </div>

      {/* Selected arrow indicator */}
      {selected && (
        <div
          className="flex items-center justify-center px-3 flex-shrink-0"
          style={{ backgroundColor: '#2D5A1B', borderLeft: '3px solid #000' }}
        >
          <span className="font-press-start text-[8px] text-green-400">▶</span>
        </div>
      )}
    </div>
  );
}

/* ── Right panel: empty state ── */
function EmptyDetail() {
  return (
    <div className="mc-store-right-empty">
      <span style={{ fontSize: '64px', opacity: 0.35 }}>📦</span>
      <p className="font-press-start text-[9px] text-green-400" style={{ opacity: 0.6 }}>
        Select an Item
      </p>
      <p className="font-space-mono text-[9px] text-center" style={{ color: '#8A6030', maxWidth: '200px', lineHeight: '1.6' }}>
        Click any listing on the left to view full details
      </p>
    </div>
  );
}

/* ── Right panel: item detail ── */
function ItemDetail({ item }) {
  const isEnchanted = item.enchant !== 'None';
  const tradeBg     = item.tradeType === 'Selling' ? '#0f2d00' : '#280040';
  const tradeColor  = item.tradeType === 'Selling' ? '#8BC34A' : '#c388db';
  const tradeBorder = item.tradeType === 'Selling' ? '#5D8A2C' : '#9B59B6';

  return (
    <div className="mc-store-right-detail">

      {/* ── Item header ── */}
      <div
        className="flex gap-4 items-start mb-6 pb-5"
        style={{ borderBottom: '4px solid #000' }}
      >
        {/* Large pixel image */}
        <div className="mc-detail-img" style={{ backgroundColor: item.color }}>
          <span style={{ fontSize: '48px', position: 'relative', zIndex: 1 }}>
            {item.icon}
          </span>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <p className="font-press-start text-[11px] leading-relaxed" style={{ color: '#FFF0D0' }}>
            {item.name}
          </p>

          {/* Enchantments — purple, like in-game */}
          {isEnchanted && (
            <p className="font-space-mono text-[8px] leading-relaxed" style={{ color: '#B388FF' }}>
              ✨ {item.enchant}
            </p>
          )}

          {/* Trade type badge */}
          <span
            className="font-press-start text-[6px] px-2 py-1 border-2 inline-block self-start mt-1"
            style={{ backgroundColor: tradeBg, color: tradeColor, borderColor: tradeBorder }}
          >
            {item.tradeType}
          </span>
        </div>
      </div>

      {/* ── Detail rows ── */}
      <div className="mc-detail-section-title">Details</div>

      <div className="mc-detail-row">
        <span className="mc-detail-label">💰 Cost</span>
        <span className="font-press-start text-[8px]" style={{ color: '#FFD700' }}>
          {item.cost}
        </span>
      </div>

      <div className="mc-detail-row">
        <span className="mc-detail-label">📦 Stock</span>
        <span className="font-press-start text-[8px]" style={{ color: '#FFF0D0' }}>
          {item.qty} Available
        </span>
      </div>

      <div className="mc-detail-row">
        <span className="mc-detail-label">📅 Listed</span>
        <span className="font-space-mono text-[9px]" style={{ color: '#E8C888' }}>
          {item.listed}
        </span>
      </div>

      <div className="mc-detail-row">
        <span className="mc-detail-label">⚗️ Enchant</span>
        {isEnchanted ? (
          <span className="font-space-mono text-[8px] leading-relaxed" style={{ color: '#B388FF' }}>
            {item.enchant}
          </span>
        ) : (
          <span className="font-space-mono text-[9px]" style={{ color: '#8A6030' }}>None</span>
        )}
      </div>

      <div className="mc-detail-row">
        <span className="mc-detail-label">👤 Seller</span>
        <button className="mc-clickable-tag" style={{ fontSize: '9px', color: '#E8C888' }}>
          {FILLER_STORE.owner}
        </button>
      </div>

      <div className="mc-detail-row">
        <span className="mc-detail-label">🌐 Server</span>
        <button className="mc-clickable-tag" style={{ fontSize: '9px', color: '#E8C888' }}>
          {FILLER_STORE.server}
        </button>
      </div>

      {/* ── Notes ── */}
      <div className="mc-detail-notes mt-4">
        <p className="mc-detail-section-title" style={{ marginBottom: '8px' }}>Seller Notes</p>
        <p className="font-space-mono text-[9px] leading-relaxed" style={{ color: '#E8C888' }}>
          {item.notes}
        </p>
      </div>

    </div>
  );
}

/* ── Store page ── */
export default function StorePage() {
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSelect = (item) => {
    // clicking the same item again deselects it
    setSelectedItem((prev) => (prev?.id === item.id ? null : item));
  };

  const { typeStyle, name, owner, server, type, status } = FILLER_STORE;

  return (
    <div className="mc-store-layout">

      {/* ════════════════════════════════
          LEFT HALF
      ════════════════════════════════ */}
      <div className="mc-store-left">

        {/* ── Store header ── */}
        <div className="mc-store-header">
          {/* Grass stripe accent */}
          <div className="mc-store-header-accent" />

          <div className="mc-store-header-body">
            <div className="flex items-start gap-4">

              {/* Store type icon block */}
              <div
                className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
                style={{
                  backgroundColor: typeStyle.bg,
                  border: '3px solid #000',
                  boxShadow: '3px 3px 0 #000, inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.1)',
                  imageRendering: 'pixelated',
                }}
              >
                <span style={{ fontSize: '26px' }}>{typeStyle.icon}</span>
              </div>

              {/* Store info */}
              <div className="flex-1 min-w-0">
                <h1 className="font-press-start text-[11px] leading-relaxed mb-2" style={{ color: '#FFF0D0' }}>
                  {name}
                </h1>

                {/* Owner + server — clickable */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <button className="mc-clickable-tag" style={{ fontSize: '9px' }}>
                    👤 {owner}
                  </button>
                  <span style={{ color: '#5A3A14', fontFamily: 'Space Mono', fontSize: '9px' }}>•</span>
                  <button className="mc-clickable-tag" style={{ fontSize: '9px' }}>
                    🌐 {server}
                  </button>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Type badge */}
                  <span
                    className="font-press-start text-[6px] px-2 py-1 border-2 inline-block"
                    style={{ backgroundColor: typeStyle.bg, color: typeStyle.text, borderColor: typeStyle.accent }}
                  >
                    {type}
                  </span>

                  {/* Status badge */}
                  <span
                    className="font-press-start text-[6px] px-2 py-1 border-2 inline-block"
                    style={{ backgroundColor: '#0f2d00', color: '#7BC63A', borderColor: '#5D8A2C' }}
                  >
                    ● {status}
                  </span>

                  {/* Item count */}
                  <span className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
                    📦 {FILLER_ITEMS.length} items
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable item list ── */}
        <div className="mc-store-items-scroll">
          {FILLER_ITEMS.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              selected={selectedItem?.id === item.id}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>

      {/* ════════════════════════════════
          RIGHT HALF
      ════════════════════════════════ */}
      <div className="mc-store-right">

        {/* Right panel header */}
        <div className="mc-store-right-header">
          <span className="font-press-start text-[8px] text-green-400">
            {selectedItem ? '📋 Item Details' : '📋 Browse Items'}
          </span>
          {selectedItem && (
            <span className="font-space-mono text-[9px] ml-2" style={{ color: '#C4904A' }}>
              — {selectedItem.name}
            </span>
          )}
        </div>

        {/* Content */}
        {selectedItem
          ? <ItemDetail item={selectedItem} />
          : <EmptyDetail />
        }
      </div>

    </div>
  );
}
