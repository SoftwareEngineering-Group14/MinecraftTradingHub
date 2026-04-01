"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import LogoutButton from './LogOutForm';
import { useViewMode } from '../contexts/ViewModeContext';

export default function Sidebar({ username, isAdmin }) {
  const pathname = usePathname();
  const { isAdminView, setIsAdminView } = useViewMode();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initial = username ? username.charAt(0).toUpperCase() : '?';
  const onDashboard = pathname === '/home/dashboard' || pathname === '/home';
  const onServers   = pathname === '/home/servers';
  const onProfile   = pathname === '/home/profile';

  return (
    <aside className="mc-sidebar">

      {/* ── Logo ── */}
      <div className="mc-sidebar-logo">
        <h1 className="font-press-start text-[10px] text-green-400 leading-loose">
          ⛏ TRADING<br />HUB
        </h1>
      </div>

      {/* ── Admin view indicator bar ── */}
      {isAdminView && (
        <div className="mc-admin-bar">
          <span className="font-press-start text-[7px] text-yellow-400">⚡ ADMIN VIEW</span>
        </div>
      )}

      {/* ── Profile ── */}
      <div className="mc-sidebar-profile">
        <div
          className="mc-avatar-sm flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #92400e 0%, #78350f 50%, #92400e 100%)' }}
        >
          <span className="font-press-start text-[11px] text-amber-200 select-none">{initial}</span>
        </div>

        <div className="flex flex-col gap-1 overflow-hidden">
          <span className="font-press-start text-[8px] text-green-400 truncate leading-relaxed">
            {username}
          </span>
          {/* warm cream — clearly readable on dark log sidebar */}
          <span className="font-space-mono text-[9px]" style={{ color: '#C4904A' }}>
            {isAdmin ? 'Administrator' : 'Hub Resident'}
          </span>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="mc-search-bar">
        <p className="font-press-start text-[7px] uppercase mb-2" style={{ color: '#C4904A' }}>
          Recent Stores
        </p>
        <input
          type="text"
          placeholder="Search stores..."
          className="mc-search-input"
          readOnly
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="mc-nav-section">
        <Link
          href="/home/dashboard"
          className={`mc-nav-link ${onDashboard ? 'mc-nav-link-active' : ''}`}
        >
          📦 &nbsp;Dashboard
        </Link>
        <Link
          href="/home/servers"
          className={`mc-nav-link ${onServers ? 'mc-nav-link-active' : ''}`}
        >
          🌐 &nbsp;Servers
        </Link>
        <Link
          href="/home/profile"
          className={`mc-nav-link ${onProfile ? 'mc-nav-link-active' : ''}`}
        >
          👤 &nbsp;Profile
        </Link>
      </nav>

      {/* ── Admin view toggle (admins only) ── */}
      {isAdmin && (
        <div className="p-3 border-t-4 border-black" style={{ position: 'relative' }}>
          <button
            className="mc-admin-toggle"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <span className="font-press-start text-[7px] text-yellow-400">
              {isAdminView ? '⚡ Admin View' : '👤 User View'}
            </span>
            <span className="font-press-start text-[7px]" style={{ color: '#C4904A' }}>
              {dropdownOpen ? '▲' : '▼'}
            </span>
          </button>

          {dropdownOpen && (
            <div className="mc-dropdown" style={{ top: 'calc(100% - 12px)' }}>
              <button
                className={`mc-dropdown-item ${isAdminView ? 'mc-dropdown-item-active' : ''}`}
                onClick={() => { setIsAdminView(true);  setDropdownOpen(false); }}
              >
                ⚡ &nbsp;Admin View
              </button>
              <button
                className={`mc-dropdown-item ${!isAdminView ? 'mc-dropdown-item-active' : ''}`}
                onClick={() => { setIsAdminView(false); setDropdownOpen(false); }}
              >
                👤 &nbsp;User View
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Logout ── */}
      <div className="mt-auto p-4 border-t-4 border-black">
        <LogoutButton />
      </div>
    </aside>
  );
}
