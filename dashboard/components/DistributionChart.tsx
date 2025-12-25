'use client';

const data = [
  { name: 'Volume', value: 25, color: '#3498db' },
  { name: 'Buyback', value: 25, color: '#ff3333' },
  { name: 'Airdrop', value: 25, color: '#00e676' },
  { name: 'Treasury', value: 25, color: '#ffcc00' },
];

export function DistributionChart() {
  return (
    <div className="pixel-card">
      <h2 className="font-pixel-headline text-sm text-white mb-5 flex items-center gap-2">
        <span>&#128200;</span>
        Fee Distribution
      </h2>

      <div className="progress-bar-container mb-4">
        {data.map((segment) => (
          <div
            key={segment.name}
            className="bar-segment"
            style={{
              width: `${segment.value}%`,
              backgroundColor: segment.color,
            }}
          >
            {segment.name}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-lg">
            <div
              className="w-4 h-4"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted">{item.name}</span>
            <span className="text-white ml-auto">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
