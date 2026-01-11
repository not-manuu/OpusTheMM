'use client';

import { MarketSnapshot } from '@/lib/types';

interface MarketOverviewProps {
  marketData: MarketSnapshot | null;
}

function PriceChange({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  const colorClass = isPositive ? 'text-accent-green' : 'text-accent-red';
  const arrow = isPositive ? '▲' : '▼';

  return (
    <div className="text-center">
      <span className={`text-lg font-bold ${colorClass}`}>
        {arrow} {Math.abs(value).toFixed(2)}%
      </span>
      <p className="text-muted text-xs uppercase">{label}</p>
    </div>
  );
}

function ProgressBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const percent = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="text-white">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-[#1a1a2e] border border-[#3a3a5e] overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#3a3a5e] last:border-0">
      <span className="text-muted text-sm">{label}</span>
      <div className="text-right">
        <span className="text-white font-mono">{value}</span>
        {subValue && <span className="text-muted text-xs ml-2">({subValue})</span>}
      </div>
    </div>
  );
}

export function MarketOverview({ marketData }: MarketOverviewProps) {
  if (!marketData) {
    return (
      <div className="pixel-card">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">📈</span>
          <div>
            <h2 className="font-pixel-headline text-xs text-accent-gold uppercase">MARKET DATA</h2>
            <p className="text-muted text-sm">Real-time metrics</p>
          </div>
        </div>
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">📊</span>
          <p className="text-muted">Waiting for market data...</p>
        </div>
      </div>
    );
  }

  const { price, volume, holders, bondingCurve } = marketData;
  const buySellRatio = volume.buySellRatio;
  const buyPressure = buySellRatio > 1;

  return (
    <div className="pixel-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📈</span>
          <div>
            <h2 className="font-pixel-headline text-xs text-accent-gold uppercase">MARKET DATA</h2>
            <p className="text-muted text-sm">Real-time metrics</p>
          </div>
        </div>
        <span className="text-xs text-muted">
          {new Date(marketData.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Price Section */}
      <div className="mb-4 p-3 bg-[#1a1a2e] border-2 border-[#3a3a5e]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-muted text-xs uppercase">Current Price</span>
            <p className="text-2xl font-bold text-white font-mono">
              ${price.current < 0.01 ? price.current.toExponential(4) : price.current.toFixed(6)}
            </p>
          </div>
          <div className="flex gap-4">
            <PriceChange value={price.change1h} label="1h" />
            <PriceChange value={price.change24h} label="24h" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>24h Low: ${price.low24h < 0.01 ? price.low24h.toExponential(2) : price.low24h.toFixed(6)}</span>
          <span>24h High: ${price.high24h < 0.01 ? price.high24h.toExponential(2) : price.high24h.toFixed(6)}</span>
        </div>
      </div>

      {/* Volume & Holders */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-[#1a1a2e] border border-[#3a3a5e]">
          <span className="text-muted text-xs uppercase">24h Volume</span>
          <p className="text-xl font-bold text-accent-blue font-mono">
            ${volume.volume24h >= 1000
              ? `${(volume.volume24h / 1000).toFixed(1)}K`
              : volume.volume24h.toFixed(2)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs ${buyPressure ? 'text-accent-green' : 'text-accent-red'}`}>
              {buyPressure ? '🟢' : '🔴'} {buySellRatio.toFixed(2)}x
            </span>
            <span className="text-muted text-xs">
              {buyPressure ? 'Buy' : 'Sell'} Pressure
            </span>
          </div>
        </div>
        <div className="p-3 bg-[#1a1a2e] border border-[#3a3a5e]">
          <span className="text-muted text-xs uppercase">Holders</span>
          <p className="text-xl font-bold text-accent-green font-mono">
            {holders.total.toLocaleString()}
          </p>
          <div className="mt-2">
            <span className={`text-xs ${holders.change24h >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {holders.change24h >= 0 ? '+' : ''}{holders.change24h} (24h)
            </span>
          </div>
        </div>
      </div>

      {/* Bonding Curve Progress */}
      <div className="mb-4">
        <ProgressBar
          value={bondingCurve.progressPercent}
          max={100}
          label={bondingCurve.isComplete ? '🎉 Graduated!' : '📈 Bonding Curve Progress'}
          color={bondingCurve.isComplete ? 'bg-accent-green' : 'bg-accent-gold'}
        />
        {!bondingCurve.isComplete && (
          <p className="text-xs text-muted mt-2">
            {(100 - bondingCurve.progressPercent).toFixed(1)}% remaining until graduation
          </p>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="border-t-2 border-dashed border-[#8b9bb4] pt-4">
        <StatRow
          label="Buy Volume (24h)"
          value={`$${volume.buyVolume24h >= 1000 ? `${(volume.buyVolume24h / 1000).toFixed(1)}K` : volume.buyVolume24h.toFixed(2)}`}
        />
        <StatRow
          label="Sell Volume (24h)"
          value={`$${volume.sellVolume24h >= 1000 ? `${(volume.sellVolume24h / 1000).toFixed(1)}K` : volume.sellVolume24h.toFixed(2)}`}
        />
        <StatRow
          label="Virtual SOL Reserves"
          value={`${(bondingCurve.virtualSolReserves / 1e9).toFixed(2)} SOL`}
        />
      </div>
    </div>
  );
}
