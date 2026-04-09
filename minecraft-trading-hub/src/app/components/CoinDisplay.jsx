'use client';

import { useState, useEffect } from 'react';

export default function CoinDisplay({ initialCoins }) {
  const [coins, setCoins] = useState(initialCoins);

  useEffect(() => {
    function handleBalanceUpdate(e) {
      setCoins(e.detail.newBalance);
    }
    window.addEventListener('coinBalanceUpdated', handleBalanceUpdate);
    return () => window.removeEventListener('coinBalanceUpdated', handleBalanceUpdate);
  }, []);

  return (
    <div className="px-3 py-1 rounded-lg border border-[#8fca5c] bg-[#4e6a1d] text-xs text-white font-space-mono">
      {coins} 🪙
    </div>
  );
}
