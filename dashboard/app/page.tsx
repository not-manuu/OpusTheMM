'use client';

import { Header } from '@/components/Header';
import { StatsCards } from '@/components/StatsCards';
import { ActivityFeed } from '@/components/ActivityFeed';
import { WalletBalances } from '@/components/WalletBalances';
import { DistributionChart } from '@/components/DistributionChart';
import { AIBrain } from '@/components/AIBrain';
import { MarketOverview } from '@/components/MarketOverview';
import { ConsciousnessTerminal } from '@/components/ConsciousnessTerminal';
import { MindStream } from '@/components/MindStream';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useStats } from '@/hooks/useStats';

export default function Dashboard() {
  const { isConnected, events, aiState, consciousness } = useWebSocket();
  const { stats, wallets, loading, error } = useStats();

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Header */}
        <Header isConnected={isConnected} isThinking={aiState.isThinking} />

        {error && (
          <div className="mb-6 claude-card border-error">
            <p className="text-error text-sm">
              <span className="mr-2">Warning:</span> {error}
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Terminal */}
          <div className="xl:col-span-2">
            <div className="h-[520px]">
              <ConsciousnessTerminal
                thoughts={consciousness.thoughts}
                isStreaming={consciousness.isStreaming || aiState.isThinking}
              />
            </div>
          </div>

          {/* Right Column: Mind Stream */}
          <div className="xl:col-span-1">
            <div className="h-[520px]">
              <MindStream
                thoughts={consciousness.mindStream}
                isThinking={aiState.isThinking}
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <section className="mt-6">
          <StatsCards stats={stats} loading={loading} />
        </section>

        {/* AI Brain + Market Data */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <AIBrain aiState={aiState} />
          <MarketOverview marketData={aiState.marketData} />
        </section>

        {/* Fee Distribution */}
        <section className="mt-6">
          <DistributionChart />
        </section>

        {/* Bottom Grid: Wallets + Activity Feed */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <WalletBalances wallets={wallets} loading={loading} />
          <ActivityFeed events={events} />
        </section>

        {/* Footer */}
        <footer className="mt-8 text-center pb-8">
          <div className="flex items-center justify-center gap-4 text-sm text-muted">
            <span>Powered by Claude</span>
            <span className="text-elevated">|</span>
            <span>
              Status:{' '}
              <span className={stats?.status?.isRunning ? 'text-success' : 'text-error'}>
                {stats?.status?.isRunning
                  ? stats?.status?.isPaused
                    ? 'Paused'
                    : 'Running'
                  : 'Stopped'}
              </span>
            </span>
            {stats?.status?.startTime && (
              <>
                <span className="text-elevated">|</span>
                <span>Since: {new Date(stats.status.startTime).toLocaleString()}</span>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
