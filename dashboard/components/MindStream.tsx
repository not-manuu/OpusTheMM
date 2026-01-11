'use client';

import { useEffect, useRef } from 'react';
import { MindStreamThought, MindStreamType } from '@/lib/types';

interface MindStreamProps {
  thoughts: MindStreamThought[];
  isThinking: boolean;
}

const THOUGHT_CONFIG: Record<MindStreamType, { icon: string; label: string; className: string }> = {
  IDEA: { icon: '', label: 'IDEA', className: 'idea' },
  THOUGHT: { icon: '', label: 'THOUGHT', className: 'thinking' },
  OBSERVATION: { icon: '', label: 'OBSERVATION', className: 'observing' },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour === 1) return '1 hour ago';
  return `${diffHour} hours ago`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function MindStream({ thoughts, isThinking }: MindStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top (newest first)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [thoughts]);

  // Reverse to show newest first
  const reversedThoughts = [...thoughts].reverse();

  return (
    <div className="mind-stream h-full flex flex-col">
      {/* Header */}
      <div className="mind-stream-header">
        <div className="flex items-center gap-3">
          <span className="text-lg"></span>
          <span className="text-secondary text-sm font-medium">MIND STREAM</span>
        </div>
        <div className="flex items-center gap-2">
          {isThinking ? (
            <span className="status-badge streaming animate-pulse">THINKING</span>
          ) : (
            <span className="text-muted text-xs">Latest insights</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="mind-stream-content flex-1 overflow-y-auto">
        {reversedThoughts.length === 0 ? (
          <div className="text-muted text-center py-8">
            <p className="text-4xl mb-4"></p>
            <p className="text-sm">Mind stream will show categorized insights here.</p>
          </div>
        ) : (
          reversedThoughts.map((thought) => {
            const config = THOUGHT_CONFIG[thought.type];
            return (
              <div key={thought.id} className={`thought-card ${config.className}`}>
                <div className="flex items-start gap-3">
                  <div className={`thought-icon ${config.className}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-primary text-sm leading-relaxed">
                      {thought.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-muted text-xs uppercase tracking-wide">
                        {config.label}
                      </span>
                      <span className="text-muted text-xs">
                        {formatDateTime(thought.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
