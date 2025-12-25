'use client';

import { Header } from '@/components/Header';
import { StatsCards } from '@/components/StatsCards';
import { ActivityFeed } from '@/components/ActivityFeed';
import { WalletBalances } from '@/components/WalletBalances';
import { DistributionChart } from '@/components/DistributionChart';
import { SnowCanvas } from '@/components/SnowCanvas';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useStats } from '@/hooks/useStats';

export default function Dashboard() {
  const { isConnected, events } = useWebSocket();
  const { stats, wallets, loading, error } = useStats();

  return (
    <>
      {/* Snow Animation */}
      <SnowCanvas />

      <div className="relative z-10 min-h-screen">
        <div className="max-w-[1200px] mx-auto px-5 py-5">
          <Header isConnected={isConnected} />

          {error && (
            <div className="mb-6 pixel-card border-[#ff3333]">
              <p className="text-accent-red text-lg">
                <span>&#9888;&#65039;</span> {error}
              </p>
            </div>
          )}

          {/* Stats Cards */}
          <section className="mb-8">
            <StatsCards stats={stats} loading={loading} />
          </section>

          {/* Fee Distribution */}
          <section className="mb-8">
            <DistributionChart />
          </section>

          {/* Bottom Grid: Wallets + Activity Feed */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <WalletBalances wallets={wallets} loading={loading} />
            <ActivityFeed events={events} />
          </section>

          {/* Footer Status */}
          <footer className="mt-8 text-center text-muted text-lg pb-8">
            <p>
              Bot Status:{' '}
              <span
                className={
                  stats?.status?.isRunning ? 'text-accent-green' : 'text-accent-red'
                }
              >
                {stats?.status?.isRunning
                  ? stats?.status?.isPaused
                    ? 'Paused'
                    : 'Running'
                  : 'Stopped'}
              </span>
              {stats?.status?.startTime && (
                <span className="ml-4">
                  Started: {new Date(stats.status.startTime).toLocaleString()}
                </span>
              )}
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
