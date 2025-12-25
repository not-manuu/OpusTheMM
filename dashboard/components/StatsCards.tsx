'use client';

import { ComprehensiveStats } from '@/lib/types';

interface StatsCardsProps {
  stats: ComprehensiveStats | null;
  loading: boolean;
}

interface StatCardProps {
  emoji: string;
  title: string;
  mainValue: string;
  mainLabel: string;
  secondaryValue: string;
  secondaryLabel: string;
  color: string;
}

function StatCard({
  emoji,
  title,
  mainValue,
  mainLabel,
  secondaryValue,
  secondaryLabel,
  color,
}: StatCardProps) {
  const colorClass = {
    red: 'text-accent-red',
    blue: 'text-accent-blue',
    orange: 'text-accent-orange',
    green: 'text-accent-green',
  }[color] || 'text-white';

  return (
    <div className="pixel-card">
      <div className="text-5xl mb-3">{emoji}</div>
      <h2 className="font-pixel-headline text-xs text-accent-gold mb-4 uppercase">
        {title}
      </h2>
      <div className="space-y-2">
        <div>
          <span className={`text-3xl font-bold block mb-1 ${colorClass}`}>
            {mainValue}
          </span>
          <span className="text-muted text-lg uppercase">{mainLabel}</span>
        </div>
        <div className="mt-4 pt-3 border-t-2 border-dashed border-[#8b9bb4] flex justify-between text-lg">
          <span className="text-muted">{secondaryLabel}</span>
          <span className="text-white">{secondaryValue}</span>
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="pixel-card animate-pulse">
      <div className="h-12 bg-[#2a2a4e] mb-3 w-12" />
      <div className="h-4 bg-[#2a2a4e] w-24 mb-4" />
      <div className="h-8 bg-[#2a2a4e] w-32 mb-2" />
      <div className="h-4 bg-[#2a2a4e] w-20" />
    </div>
  );
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <LoadingCard key={i} />
        ))}
      </div>
    );
  }

  // Safe accessors with defaults
  const fees = stats.fees || { totalCollected: 0, claimCount: 0 };
  const volume = stats.volume || { totalVolume: 0, tradeCount: 0 };
  const burns = stats.burns || { totalBurned: 0, burnCount: 0 };
  const airdrops = stats.airdrops || { uniqueRecipients: 0, distributionCount: 0 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatCard
        emoji="&#127877;"
        title="SANTA"
        mainValue={`${(fees.totalCollected || 0).toFixed(4)} SOL`}
        mainLabel="Total Collected"
        secondaryValue={(fees.claimCount || 0).toString()}
        secondaryLabel="Claims"
        color="red"
      />
      <StatCard
        emoji="&#10052;&#65039;"
        title="VOLUME"
        mainValue={`${(volume.totalVolume || 0).toFixed(4)} SOL`}
        mainLabel="Total Volume"
        secondaryValue={(volume.tradeCount || 0).toString()}
        secondaryLabel="Trades"
        color="blue"
      />
      <StatCard
        emoji="&#128293;"
        title="BURN"
        mainValue={`${(burns.totalBurned || 0).toLocaleString()}`}
        mainLabel="Tokens Burned"
        secondaryValue={(burns.burnCount || 0).toString()}
        secondaryLabel="Burns"
        color="orange"
      />
      <StatCard
        emoji="&#129666;"
        title="AIRDROP"
        mainValue={(airdrops.uniqueRecipients || 0).toString()}
        mainLabel="Unique Recipients"
        secondaryValue={(airdrops.distributionCount || 0).toString()}
        secondaryLabel="Distributions"
        color="green"
      />
    </div>
  );
}
