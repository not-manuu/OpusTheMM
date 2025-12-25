'use client';

import { WalletData } from '@/lib/types';

interface WalletBalancesProps {
  wallets: WalletData | null;
  loading: boolean;
}

interface WalletRowProps {
  emoji: string;
  label: string;
  balance: number;
  address?: string;
}

function WalletRow({ emoji, label, balance, address }: WalletRowProps) {
  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : null;

  return (
    <li className="flex items-center justify-between py-3 border-b border-white/10">
      <span className="text-lg">
        {emoji} {label}
      </span>
      <div className="text-right">
        {shortAddress && (
          <div className="font-mono text-muted text-sm">{shortAddress}</div>
        )}
        <span className="text-accent-gold text-lg">{(balance || 0).toFixed(4)} SOL</span>
      </div>
    </li>
  );
}

export function WalletBalances({ wallets, loading }: WalletBalancesProps) {
  if (loading) {
    return (
      <div className="pixel-card animate-pulse">
        <div className="h-6 bg-[#2a2a4e] w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-[#2a2a4e]" />
          ))}
        </div>
      </div>
    );
  }

  if (!wallets) {
    return (
      <div className="pixel-card">
        <p className="text-muted">Failed to load wallet data</p>
      </div>
    );
  }

  // Safe accessors
  const master = wallets.master || { balance: 0, address: '' };
  const reindeer = wallets.reindeer || {};
  const volume = reindeer.volume || { emoji: '\u2744\uFE0F', totalBalance: 0 };
  const buyback = reindeer.buyback || { emoji: '\u{1F525}', balance: 0, address: '' };
  const treasury = reindeer.treasury || { emoji: '\u{1F3E6}', balance: 0, address: '' };

  return (
    <div className="pixel-card">
      <div className="font-pixel-headline text-sm text-white mb-5 flex items-center gap-2">
        <span>&#128176;</span>
        Wallet Balances
      </div>

      <ul className="list-none">
        <WalletRow
          emoji="&#127877;"
          label="Master"
          balance={master.balance}
          address={master.address}
        />
        <WalletRow
          emoji={volume.emoji || '\u2744\uFE0F'}
          label="Volume"
          balance={volume.totalBalance || 0}
        />
        <WalletRow
          emoji={buyback.emoji || '\u{1F525}'}
          label="Buyback"
          balance={buyback.balance || 0}
          address={buyback.address}
        />
        <WalletRow
          emoji={treasury.emoji || '\u{1F3E6}'}
          label="Treasury"
          balance={treasury.balance || 0}
          address={treasury.address}
        />
      </ul>
    </div>
  );
}
