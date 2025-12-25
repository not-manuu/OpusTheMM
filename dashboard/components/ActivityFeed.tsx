'use client';

import { ActivityEvent, WSEventType } from '@/lib/types';

interface ActivityFeedProps {
  events: ActivityEvent[];
}

function getEventIcon(type: WSEventType): string {
  switch (type) {
    case 'fee_collected':
      return '\u{1F385}'; // Santa
    case 'volume':
      return '\u2744\uFE0F'; // Snowflake
    case 'burn':
      return '\u{1F525}'; // Fire
    case 'airdrop':
      return '\u{1FA82}'; // Parachute
    case 'treasury':
      return '\u{1F3E6}'; // Bank
    case 'error':
      return '\u26A0\uFE0F'; // Warning
    case 'connected':
      return '\u2705'; // Check
    default:
      return '\u{1F4E1}'; // Satellite
  }
}

function getEventColorClass(type: WSEventType): string {
  switch (type) {
    case 'fee_collected':
      return 'text-accent-red';
    case 'volume':
      return 'text-accent-blue';
    case 'burn':
      return 'text-accent-orange';
    case 'airdrop':
      return 'text-accent-purple';
    case 'treasury':
      return 'text-accent-gold';
    case 'error':
      return 'text-accent-red';
    case 'connected':
      return 'text-accent-green';
    default:
      return 'text-muted';
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="terminal h-full min-h-[280px]">
      <div className="terminal-header flex justify-between items-center">
        <span className="font-pixel-headline text-xs">
          <span>&#128226;</span> Live Activity Feed
          {events.length > 0 && (
            <span className="ml-2 text-xs bg-[#00e676]/20 px-2 py-0.5">
              {events.length}
            </span>
          )}
        </span>
        <span className="text-accent-green text-sm">v1.0</span>
      </div>

      <div className="h-52 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-lg">
            <p>Waiting for events...</p>
          </div>
        ) : (
          <div>
            {events.map((event) => (
              <div
                key={event.id}
                className="activity-item py-2 text-lg"
              >
                <span className="text-muted mr-3">{formatTime(event.timestamp)}</span>
                <span className={getEventColorClass(event.type)}>
                  {getEventIcon(event.type)} {event.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blinking cursor */}
      <div className="blink w-2.5 h-4 bg-[#00e676] mt-2 inline-block" />
    </div>
  );
}
