"use client";

import { useState } from 'react';
import Link from 'next/link';

/* ── Server type styles ── */
const SERVER_TYPES = {
  Survival:  { bg: '#0f2d00', accent: '#5D8A2C', text: '#8BC34A', icon: '🌲' },
  SMP:       { bg: '#3c2010', accent: '#c4a14a', text: '#e8cc88', icon: '🏘️' },
  Creative:  { bg: '#002040', accent: '#3498DB', text: '#70b8ec', icon: '🎨' },
  Hardcore:  { bg: '#0a0a0a', accent: '#888888', text: '#cccccc', icon: '💀' },
  Factions:  { bg: '#4a0000', accent: '#ff2222', text: '#ff8888', icon: '⚔️' },
  SkyBlock:  { bg: '#002a40', accent: '#00BFFF', text: '#80DFFF', icon: '☁️' },
  MiniGames: { bg: '#3a2e00', accent: '#FFD700', text: '#ffe860', icon: '🎮' },
  Prison:    { bg: '#280040', accent: '#9B59B6', text: '#c388db', icon: '⛓️' },
};

/* ── Store type styles (for store cards in right panel) ── */
const STORE_TYPE_STYLES = {
  Trading:     { bg: '#3a2e00', accent: '#FFD700', text: '#ffe860', icon: '💰' },
  Redstone:    { bg: '#4a0000', accent: '#ff2222', text: '#ff8888', icon: '⚡' },
  Farming:     { bg: '#0f2d00', accent: '#5D8A2C', text: '#8BC34A', icon: '🌾' },
  PvP:         { bg: '#4a1000', accent: '#ff6600', text: '#ffaa60', icon: '⚔️' },
  Creative:    { bg: '#002040', accent: '#3498DB', text: '#70b8ec', icon: '🎨' },
  'Rare Items':{ bg: '#280040', accent: '#9B59B6', text: '#c388db', icon: '💎' },
  Building:    { bg: '#3c2010', accent: '#c4a14a', text: '#e8cc88', icon: '🧱' },
  Hardcore:    { bg: '#0a0a0a', accent: '#888888', text: '#cccccc', icon: '💀' },
};

/* ── Filler data ── */
const FILLER_SERVERS = [
  {
    id: 1, name: 'SurvivalCraft', owner: 'Steve_Builder', type: 'Survival',
    status: 'Online', members: 247,
    stores: [
      { id: 1, name: 'Diamond Emporium',  type: 'Trading',    owner: 'Steve_Builder',  updated: '2h ago'  },
      { id: 9, name: 'Farm Fresh',        type: 'Farming',    owner: 'CropKing2024',   updated: '45m ago' },
      { id: 7, name: 'Build Supply Co.',  type: 'Building',   owner: 'ArchitectXL',    updated: '12h ago' },
      { id: 6, name: 'Rare Finds Shop',   type: 'Rare Items', owner: 'TreasureHuntr',  updated: '2d ago'  },
    ],
  },
  {
    id: 2, name: 'Redtech SMP', owner: 'PistonPro99', type: 'SMP',
    status: 'Online', members: 134,
    stores: [
      { id: 2,  name: 'Redstone Depot',    type: 'Redstone',  owner: 'PistonPro99',  updated: '1d ago'  },
      { id: 7,  name: 'Build Supply Co.',  type: 'Building',  owner: 'ArchitectXL',  updated: '12h ago' },
    ],
  },
  {
    id: 3, name: 'FarmLife MC', owner: 'FarmerJoe42', type: 'Survival',
    status: 'Online', members: 89,
    stores: [
      { id: 3, name: 'The Pig Farm',  type: 'Farming', owner: 'FarmerJoe42',  updated: '6h ago'  },
      { id: 9, name: 'Farm Fresh',   type: 'Farming', owner: 'CropKing2024', updated: '45m ago' },
    ],
  },
  {
    id: 4, name: 'BattleMC', owner: 'SwordMaster_X', type: 'Factions',
    status: 'Online', members: 312,
    stores: [
      { id: 4,  name: 'PvP Arsenal',    type: 'PvP', owner: 'SwordMaster_X', updated: '30m ago' },
      { id: 10, name: 'Iron Fortress',  type: 'PvP', owner: 'BlackSmith99',  updated: '5h ago'  },
    ],
  },
  {
    id: 5, name: 'BuildCraft Pro', owner: 'PixelArtist', type: 'Creative',
    status: 'Online', members: 178,
    stores: [
      { id: 5,  name: 'Creative Corner',  type: 'Creative', owner: 'PixelArtist', updated: '3h ago'  },
      { id: 7,  name: 'Build Supply Co.', type: 'Building', owner: 'ArchitectXL', updated: '12h ago' },
      { id: 12, name: 'Stone Works',      type: 'Building', owner: 'MasonRock',   updated: '8h ago'  },
    ],
  },
  {
    id: 6, name: 'VaultMC', owner: 'TreasureHuntr', type: 'SMP',
    status: 'Online', members: 203,
    stores: [
      { id: 6,  name: 'Rare Finds Shop',   type: 'Rare Items', owner: 'TreasureHuntr', updated: '2d ago' },
      { id: 11, name: 'Enchant Palace',    type: 'Rare Items', owner: 'WizardSteve',   updated: '1d ago' },
      { id: 1,  name: 'Diamond Emporium', type: 'Trading',    owner: 'Steve_Builder', updated: '2h ago' },
    ],
  },
  {
    id: 7, name: 'MegaBuild', owner: 'ArchitectXL', type: 'Creative',
    status: 'Offline', members: 95,
    stores: [
      { id: 7,  name: 'Build Supply Co.', type: 'Building', owner: 'ArchitectXL', updated: '3d ago' },
      { id: 12, name: 'Stone Works',      type: 'Building', owner: 'MasonRock',   updated: '1d ago' },
    ],
  },
  {
    id: 8, name: 'HardCore SMP', owner: 'SurvivorPro1', type: 'Hardcore',
    status: 'Online', members: 41,
    stores: [
      { id: 8,  name: 'Hardcore Hut',  type: 'Hardcore', owner: 'SurvivorPro1', updated: '4d ago' },
      { id: 10, name: 'Iron Fortress', type: 'PvP',      owner: 'BlackSmith99', updated: '5h ago' },
    ],
  },
  {
    id: 9, name: 'HarvestMC', owner: 'CropKing2024', type: 'Survival',
    status: 'Online', members: 67,
    stores: [
      { id: 9, name: 'Farm Fresh', type: 'Farming', owner: 'CropKing2024', updated: '45m ago' },
    ],
  },
  {
    id: 10, name: 'War Games', owner: 'BlackSmith99', type: 'Factions',
    status: 'Online', members: 289,
    stores: [
      { id: 10, name: 'Iron Fortress', type: 'PvP', owner: 'BlackSmith99',  updated: '5h ago'  },
      { id: 4,  name: 'PvP Arsenal',  type: 'PvP', owner: 'SwordMaster_X', updated: '30m ago' },
    ],
  },
  {
    id: 11, name: 'Magic Realm', owner: 'WizardSteve', type: 'SMP',
    status: 'Online', members: 152,
    stores: [
      { id: 11, name: 'Enchant Palace',  type: 'Rare Items', owner: 'WizardSteve',    updated: '1d ago' },
      { id: 6,  name: 'Rare Finds Shop', type: 'Rare Items', owner: 'TreasureHuntr', updated: '2d ago' },
    ],
  },
  {
    id: 12, name: 'StoneCraft', owner: 'MasonRock', type: 'Survival',
    status: 'Offline', members: 58,
    stores: [
      { id: 12, name: 'Stone Works', type: 'Building', owner: 'MasonRock', updated: '1d ago' },
    ],
  },
];

/* ── Left panel: server card ── */
function ServerCard({ server, selected, onSelect }) {
  const style   = SERVER_TYPES[server.type] || SERVER_TYPES.Survival;
  const isOnline = server.status === 'Online';

  return (
    <div
      className={`mc-server-card ${selected ? 'mc-server-card-selected' : ''}`}
      onClick={() => onSelect(server)}
    >
      {/* Type icon */}
      <div className="mc-server-card-icon" style={{ backgroundColor: style.bg }}>
        <span style={{ fontSize: '24px' }}>{style.icon}</span>
      </div>

      {/* Info */}
      <div className="mc-server-card-info">
        <p className="font-press-start text-[8px] leading-relaxed mb-1" style={{ color: '#FFF0D0' }}>
          {server.name}
        </p>
        <p className="font-space-mono text-[9px] mb-2" style={{ color: '#E8C888' }}>
          👤 {server.owner}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-press-start text-[5px] px-1.5 py-0.5 border"
            style={{ backgroundColor: style.bg, color: style.text, borderColor: style.accent }}
          >
            {server.type}
          </span>
          <span className="font-space-mono text-[8px]" style={{ color: '#C4904A' }}>
            🏪 {server.stores.length} stores
          </span>
          <span className="font-space-mono text-[8px]" style={{ color: '#C4904A' }}>
            👥 {server.members}
          </span>
        </div>
      </div>

      {/* Online status + selected indicator */}
      <div className="flex flex-col items-center justify-center gap-2 px-3 flex-shrink-0">
        <span
          className="font-press-start text-[5px]"
          style={{ color: isOnline ? '#7BC63A' : '#666666' }}
        >
          {isOnline ? '● ON' : '● OFF'}
        </span>
        {selected && (
          <span className="font-press-start text-[8px] text-green-400">▶</span>
        )}
      </div>
    </div>
  );
}

/* ── Right panel: empty state ── */
function EmptyPanel() {
  return (
    <div className="mc-store-right-empty">
      <span style={{ fontSize: '64px', opacity: 0.35 }}>🌐</span>
      <p className="font-press-start text-[9px] text-green-400" style={{ opacity: 0.6 }}>
        Select a Server
      </p>
      <p className="font-space-mono text-[9px] text-center" style={{ color: '#8A6030', maxWidth: '200px', lineHeight: '1.6' }}>
        Pick a server on the left to browse its stores
      </p>
    </div>
  );
}

/* ── Right panel: server stores view ── */
function ServerStoresPanel({ server }) {
  const serverStyle = SERVER_TYPES[server.type] || SERVER_TYPES.Survival;
  const isOnline    = server.status === 'Online';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* ── Server identity header ── */}
      <div
        className="mc-server-panel-header"
        style={{ borderBottom: '4px solid #000' }}
      >
        {/* Icon */}
        <div
          className="mc-server-panel-icon"
          style={{ backgroundColor: serverStyle.bg }}
        >
          <span style={{ fontSize: '32px' }}>{serverStyle.icon}</span>
        </div>

        {/* Name + owner + badges */}
        <div className="flex flex-col gap-2">
          <h2 className="font-press-start text-[11px] leading-relaxed" style={{ color: '#FFF0D0' }}>
            {server.name}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="mc-clickable-tag" style={{ fontSize: '9px', color: '#E8C888' }}>
              👤 {server.owner}
            </button>
            <span
              className="font-press-start text-[6px] px-2 py-1 border-2"
              style={{ backgroundColor: serverStyle.bg, color: serverStyle.text, borderColor: serverStyle.accent }}
            >
              {server.type}
            </span>
            <span
              className="font-press-start text-[6px] px-2 py-1 border-2"
              style={{
                backgroundColor: isOnline ? '#0f2d00' : '#1a1a1a',
                color:           isOnline ? '#7BC63A' : '#888888',
                borderColor:     isOnline ? '#5D8A2C' : '#555555',
              }}
            >
              ● {server.status}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
              👥 {server.members} members
            </span>
            <span className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
              🏪 {server.stores.length} stores listed
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable stores grid ── */}
      <div className="mc-server-stores-scroll">
        <div className="mc-server-stores-grid">
          {server.stores.map((store) => {
            const storeStyle = STORE_TYPE_STYLES[store.type] || STORE_TYPE_STYLES.Trading;
            return (
              <Link
                key={store.id}
                href={`/home/store/${store.id}`}
                className="mc-server-store-card"
                style={{ textDecoration: 'none' }}
              >
                {/* Store icon block */}
                <div
                  className="mc-server-store-icon"
                  style={{ backgroundColor: storeStyle.bg }}
                >
                  <span style={{ fontSize: '36px', position: 'relative', zIndex: 1 }}>
                    {storeStyle.icon}
                  </span>
                </div>

                {/* Store info */}
                <div className="mc-server-store-info">
                  <p className="font-press-start text-[8px] leading-relaxed mb-2" style={{ color: '#FFF0D0' }}>
                    {store.name}
                  </p>
                  <p className="font-space-mono text-[9px] mb-2" style={{ color: '#E8C888' }}>
                    👤 {store.owner}
                  </p>
                  <span
                    className="font-press-start text-[5px] px-1.5 py-0.5 border inline-block"
                    style={{ backgroundColor: storeStyle.bg, color: storeStyle.text, borderColor: storeStyle.accent }}
                  >
                    {store.type}
                  </span>
                  <p className="font-space-mono text-[8px] mt-2" style={{ color: '#8A6030' }}>
                    🔄 {store.updated}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}

/* ── Servers page ── */
export default function ServersPage() {
  const [selectedServer, setSelectedServer] = useState(null);

  const handleSelect = (server) => {
    setSelectedServer((prev) => (prev?.id === server.id ? null : server));
  };

  return (
    <div className="mc-store-layout">

      {/* ════════════════════════════
          LEFT — server list
      ════════════════════════════ */}
      <div className="mc-store-left">

        {/* Page header */}
        <div className="mc-store-header">
          <div className="mc-store-header-accent" />
          <div className="mc-store-header-body">
            <h1 className="font-press-start text-[10px] leading-relaxed mb-1" style={{ color: '#FFF0D0' }}>
              🌐 Servers
            </h1>
            <p className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
              {FILLER_SERVERS.length} servers &nbsp;·&nbsp;{' '}
              {FILLER_SERVERS.filter(s => s.status === 'Online').length} online
            </p>
          </div>
        </div>

        {/* Scrollable server list */}
        <div className="mc-store-items-scroll">
          {FILLER_SERVERS.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              selected={selectedServer?.id === server.id}
              onSelect={handleSelect}
            />
          ))}
        </div>

      </div>

      {/* ════════════════════════════
          RIGHT — stores panel
      ════════════════════════════ */}
      <div className="mc-store-right">

        {/* Right header bar */}
        <div className="mc-store-right-header">
          <span className="font-press-start text-[8px] text-green-400">
            {selectedServer ? '🏪 Stores' : '🌐 Browse Servers'}
          </span>
          {selectedServer && (
            <span className="font-space-mono text-[9px] ml-2" style={{ color: '#C4904A' }}>
              — {selectedServer.name}
            </span>
          )}
        </div>

        {selectedServer
          ? <ServerStoresPanel server={selectedServer} />
          : <EmptyPanel />
        }

      </div>

    </div>
  );
}
