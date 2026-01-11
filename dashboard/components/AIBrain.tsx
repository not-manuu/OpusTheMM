'use client';

import { AIThinkingState } from '@/hooks/useWebSocket';
import { ThoughtSectionName } from '@/lib/types';

interface AIBrainProps {
  aiState: AIThinkingState;
}

const SECTION_LABELS: Record<ThoughtSectionName, { label: string; icon: string }> = {
  market_analysis: { label: 'Market Analysis', icon: '' },
  sentiment: { label: 'Sentiment', icon: '' },
  risk_assessment: { label: 'Risk Assessment', icon: '' },
  strategy: { label: 'Strategy', icon: '' },
  allocation: { label: 'Allocation', icon: '' },
};

const SECTION_ORDER: ThoughtSectionName[] = [
  'market_analysis',
  'sentiment',
  'risk_assessment',
  'strategy',
  'allocation',
];

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-claude-coral rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-claude-coral rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-claude-coral rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-claude-coral text-xs">Processing</span>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    bullish: { bg: 'bg-success/20', text: 'text-success' },
    bearish: { bg: 'bg-error/20', text: 'text-error' },
    neutral: { bg: 'bg-secondary/20', text: 'text-secondary' },
    volatile: { bg: 'bg-warning/20', text: 'text-warning' },
  };
  const style = config[sentiment] || config.neutral;

  return (
    <span className={`px-3 py-1 text-xs uppercase font-semibold rounded-full ${style.bg} ${style.text}`}>
      {sentiment}
    </span>
  );
}

function AllocationBar({ allocation }: { allocation: { volume: number; buyback: number; airdrop: number; treasury: number } }) {
  const segments = [
    { key: 'volume', value: allocation.volume, className: 'volume', label: 'Vol' },
    { key: 'buyback', value: allocation.buyback, className: 'buyback', label: 'Burn' },
    { key: 'airdrop', value: allocation.airdrop, className: 'airdrop', label: 'Drop' },
    { key: 'treasury', value: allocation.treasury, className: 'treasury', label: 'Save' },
  ];

  return (
    <div className="space-y-3">
      <div className="allocation-bar">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={`allocation-segment ${seg.className}`}
            style={{ width: `${seg.value}%` }}
          >
            {seg.value >= 15 && `${seg.value}%`}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-sm allocation-segment ${seg.className}`} />
            <span className="text-muted">{seg.label}</span>
            <span className="text-secondary">{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThoughtSection({
  section,
  content,
  isActive,
  isComplete,
}: {
  section: ThoughtSectionName;
  content: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  const { label, icon } = SECTION_LABELS[section];

  return (
    <div className={`border-l-2 pl-4 py-2 ${
      isActive ? 'border-claude-coral' :
      isComplete ? 'border-success' :
      'border-elevated'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <span className={`text-xs font-semibold uppercase ${
          isActive ? 'text-claude-coral' : 'text-muted'
        }`}>
          {label}
        </span>
        {isActive && <ThinkingIndicator />}
        {isComplete && content && <span className="text-success text-xs">Done</span>}
      </div>
      {content && (
        <p className="text-sm text-secondary leading-relaxed">
          {content}
        </p>
      )}
    </div>
  );
}

export function AIBrain({ aiState }: AIBrainProps) {
  const { isThinking, currentSection, thoughts, lastDecision, lastError } = aiState;

  const hasThoughts = Object.values(thoughts).some((t) => t.length > 0);

  return (
    <div className="claude-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-tertiary flex items-center justify-center">
            <span className="text-xl"></span>
          </div>
          <div>
            <h2 className="font-mono text-sm font-bold text-claude-coral uppercase tracking-wide">AI Brain</h2>
            <p className="text-muted text-xs">Claude-Powered Decisions</p>
          </div>
        </div>
        {isThinking && (
          <span className="status-badge streaming animate-pulse">
            ANALYZING
          </span>
        )}
        {!isThinking && lastDecision && (
          <SentimentBadge sentiment={lastDecision.reasoning.sentiment} />
        )}
      </div>

      {/* Current Allocation */}
      {lastDecision && (
        <div className="mb-4 p-4 bg-tertiary rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-muted uppercase tracking-wide">Current Allocation</span>
            <span className="text-claude-amber text-xs font-semibold">
              {lastDecision.confidence}% Confident
            </span>
          </div>
          <AllocationBar allocation={lastDecision.allocation} />
        </div>
      )}

      {/* Thinking Stream */}
      {(isThinking || hasThoughts) && (
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {SECTION_ORDER.map((section) => {
            const content = thoughts[section];
            const isActive = isThinking && currentSection === section;
            const isComplete = !isThinking && content.length > 0;

            if (!content && !isActive) return null;

            return (
              <ThoughtSection
                key={section}
                section={section}
                content={content}
                isActive={isActive}
                isComplete={isComplete}
              />
            );
          })}
        </div>
      )}

      {/* Decision Summary */}
      {lastDecision && !isThinking && (
        <div className="mt-4 pt-4 border-t border-subtle">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted text-xs">Strategy</span>
              <p className="text-primary capitalize font-medium">{lastDecision.priority}</p>
            </div>
            <div>
              <span className="text-muted text-xs">Risk Level</span>
              <p className={`capitalize font-medium ${
                lastDecision.reasoning.riskLevel === 'low' ? 'text-success' :
                lastDecision.reasoning.riskLevel === 'high' ? 'text-error' : 'text-warning'
              }`}>
                {lastDecision.reasoning.riskLevel}
              </p>
            </div>
          </div>
          {lastDecision.reasoning.keyFactors && lastDecision.reasoning.keyFactors.length > 0 && (
            <div className="mt-3">
              <span className="text-muted text-xs">Key Factors</span>
              <ul className="text-sm text-secondary mt-1 space-y-1">
                {lastDecision.reasoning.keyFactors.slice(0, 3).map((factor, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-claude-coral">*</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {lastError && (
        <div className="mt-4 p-3 bg-error/10 rounded-lg border border-error/30">
          <span className="text-error text-sm">Warning: {lastError}</span>
          <p className="text-muted text-xs mt-1">Using default 25/25/25/25 allocation</p>
        </div>
      )}

      {/* No Data State */}
      {!isThinking && !lastDecision && !lastError && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-tertiary flex items-center justify-center">
            <span className="text-3xl"></span>
          </div>
          <p className="text-muted text-sm">Waiting for first fee collection to analyze...</p>
        </div>
      )}
    </div>
  );
}
