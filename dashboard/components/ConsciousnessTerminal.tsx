'use client';

import { useEffect, useRef } from 'react';
import { ConsciousnessThought, ConsciousnessType } from '@/lib/types';

interface ConsciousnessTerminalProps {
  thoughts: ConsciousnessThought[];
  isStreaming: boolean;
}

const TAG_CONFIG: Record<ConsciousnessType, { label: string; className: string }> = {
  OBSERVING: { label: 'OBSERVING', className: 'observing' },
  THINKING: { label: 'THINKING', className: 'thinking' },
  ANALYZING: { label: 'ANALYZING', className: 'analyzing' },
  DECIDING: { label: 'DECIDING', className: 'deciding' },
  EMOTIONS: { label: 'EMOTIONS', className: 'emotions' },
  IDEA: { label: 'IDEA', className: 'idea' },
  TRADE: { label: 'TRADE', className: 'trade' },
  SYSTEM: { label: 'SYSTEM', className: 'observing' },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function ConsciousnessTerminal({ thoughts, isStreaming }: ConsciousnessTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new thoughts arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div className="terminal-window h-full flex flex-col">
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="flex items-center gap-3">
          <div className="terminal-dots">
            <div className="terminal-dot red" />
            <div className="terminal-dot yellow" />
            <div className="terminal-dot green" />
          </div>
          <span className="text-secondary text-sm font-mono">TERMINAL</span>
          <span className="text-muted text-xs">{thoughts.length} lines</span>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="status-badge streaming">STREAMING</span>
          ) : (
            <span className="status-badge idle">IDLE</span>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div ref={scrollRef} className="terminal-content flex-1 overflow-y-auto">
        {thoughts.length === 0 ? (
          <div className="text-muted text-center py-8">
            <p className="mb-2">Waiting for AI brain activity...</p>
            <p className="text-sm">Consciousness stream will appear here when the AI analyzes market data.</p>
          </div>
        ) : (
          thoughts.map((thought) => {
            const tag = TAG_CONFIG[thought.type];
            return (
              <div key={thought.id} className="terminal-line">
                <span className="terminal-timestamp">{formatTime(thought.timestamp)}</span>
                <span className={`terminal-tag ${tag.className}`}>[{tag.label}]</span>
                <span className="terminal-message">{thought.message}</span>
              </div>
            );
          })
        )}
        {isStreaming && (
          <div className="terminal-line">
            <span className="terminal-timestamp">{formatTime(new Date())}</span>
            <span className="terminal-tag thinking">[...]</span>
            <span className="terminal-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}
