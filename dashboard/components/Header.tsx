'use client';

import { useState } from 'react';

interface HeaderProps {
  isConnected: boolean;
  isThinking?: boolean;
}

export function Header({ isConnected, isThinking }: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('ACA4EQhrUfCyzYuV21jQX6gpWU6dqbechE8HhKXbpump');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="claude-card mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tertiary flex items-center justify-center">
              <span className="text-2xl">*</span>
            </div>
            <div>
              <h1 className="font-mono text-lg font-bold text-primary">
                Opus the Market Maker
              </h1>
              <p className="text-xs text-muted">AI-Powered Tokenomics</p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          {/* AI Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tertiary">
            <div className={`status-indicator ${isThinking ? 'thinking' : 'online'}`} />
            <span className="text-sm text-secondary">
              {isThinking ? 'Analyzing' : 'AI Ready'}
            </span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-tertiary">
            <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`} />
            <span className={`text-sm ${isConnected ? 'text-success' : 'text-error'}`}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Contract Address Row */}
      <div className="mt-4 pt-4 border-t border-subtle">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">Token:</span>
          <button
            onClick={handleCopy}
            className="font-mono text-claude-coral hover:text-claude-amber transition-colors cursor-pointer"
            title="Click to copy"
          >
            {copied ? 'Copied!' : 'ACA4EQhrUfCyzYuV21jQX6gpWU6dqbechE8HhKXbpump'}
          </button>
        </div>
      </div>
    </header>
  );
}
