/**
 * ASCII Display Module for WhaleMarket
 * Stream-ready terminal visualization for AI market maker decisions
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
};

const c = colors;

export const ASCII_ART = {
  WHALEMARKET_BANNER: `
${c.cyan}${c.bright}
    ╦ ╦╦ ╦╔═╗╦  ╔═╗╔╦╗╔═╗╦═╗╦╔═╔═╗╔╦╗
    ║║║╠═╣╠═╣║  ║╣ ║║║╠═╣╠╦╝╠╩╗║╣  ║
    ╚╩╝╩ ╩╩ ╩╩═╝╚═╝╩ ╩╩ ╩╩╚═╩ ╩╚═╝ ╩
${c.reset}${c.cyan}
    🐋  AUTONOMOUS MARKET MAKER ENGINE  🐋
${c.reset}
`,

  THINKING: `
${c.yellow}${c.bright}   ████████╗██╗  ██╗██╗███╗   ██╗██╗  ██╗██╗███╗   ██╗ ██████╗
   ╚══██╔══╝██║  ██║██║████╗  ██║██║ ██╔╝██║████╗  ██║██╔════╝
      ██║   ███████║██║██╔██╗ ██║█████╔╝ ██║██╔██╗ ██║██║  ███╗
      ██║   ██╔══██║██║██║╚██╗██║██╔═██╗ ██║██║╚██╗██║██║   ██║
      ██║   ██║  ██║██║██║ ╚████║██║  ██╗██║██║ ╚████║╚██████╔╝
      ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝${c.reset}
`,

  ANALYZING: `
${c.blue}${c.bright}    █████╗ ███╗   ██╗ █████╗ ██╗  ██╗   ██╗███████╗██╗███╗   ██╗ ██████╗
   ██╔══██╗████╗  ██║██╔══██╗██║  ╚██╗ ██╔╝╚══███╔╝██║████╗  ██║██╔════╝
   ███████║██╔██╗ ██║███████║██║   ╚████╔╝   ███╔╝ ██║██╔██╗ ██║██║  ███╗
   ██╔══██║██║╚██╗██║██╔══██║██║    ╚██╔╝   ███╔╝  ██║██║╚██╗██║██║   ██║
   ██║  ██║██║ ╚████║██║  ██║███████╗██║   ███████╗██║██║ ╚████║╚██████╔╝
   ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝${c.reset}
`,

  DECIDING: `
${c.magenta}${c.bright}   ██████╗ ███████╗ ██████╗██╗██████╗ ██╗███╗   ██╗ ██████╗
   ██╔══██╗██╔════╝██╔════╝██║██╔══██╗██║████╗  ██║██╔════╝
   ██║  ██║█████╗  ██║     ██║██║  ██║██║██╔██╗ ██║██║  ███╗
   ██║  ██║██╔══╝  ██║     ██║██║  ██║██║██║╚██╗██║██║   ██║
   ██████╔╝███████╗╚██████╗██║██████╔╝██║██║ ╚████║╚██████╔╝
   ╚═════╝ ╚══════╝ ╚═════╝╚═╝╚═════╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝${c.reset}
`,

  EXECUTING: `
${c.green}${c.bright}   ███████╗██╗  ██╗███████╗ ██████╗██╗   ██╗████████╗██╗███╗   ██╗ ██████╗
   ██╔════╝╚██╗██╔╝██╔════╝██╔════╝██║   ██║╚══██╔══╝██║████╗  ██║██╔════╝
   █████╗   ╚███╔╝ █████╗  ██║     ██║   ██║   ██║   ██║██╔██╗ ██║██║  ███╗
   ██╔══╝   ██╔██╗ ██╔══╝  ██║     ██║   ██║   ██║   ██║██║╚██╗██║██║   ██║
   ███████╗██╔╝ ██╗███████╗╚██████╗╚██████╔╝   ██║   ██║██║ ╚████║╚██████╔╝
   ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝    ╚═╝   ╚═╝╚═╝  ╚═══╝ ╚═════╝${c.reset}
`,

  COMPLETE: `
${c.green}${c.bright}    ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗     ███████╗████████╗███████╗
   ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║     ██╔════╝╚══██╔══╝██╔════╝
   ██║     ██║   ██║██╔████╔██║██████╔╝██║     █████╗     ██║   █████╗
   ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║     ██╔══╝     ██║   ██╔══╝
   ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ███████╗███████╗   ██║   ███████╗
    ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚══════╝╚══════╝   ╚═╝   ╚══════╝${c.reset}
`,
};

/**
 * Create a progress bar
 */
export function progressBar(percent: number, width: number = 30, label: string = ''): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const percentStr = `${percent}%`.padStart(4);
  return `${label}${bar}  ${percentStr}`;
}

/**
 * Display allocation bars
 */
export function displayAllocations(allocations: {
  volume: number;
  buyback: number;
  airdrop: number;
  treasury: number;
}): void {
  const divider = `${c.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`;

  console.log(divider);
  console.log('');
  console.log(`   ${c.cyan}⚡ VOLUME    ${c.reset}${progressBar(allocations.volume, 30)}`);
  console.log(`   ${c.red}🔥 BURN      ${c.reset}${progressBar(allocations.buyback, 30)}`);
  console.log(`   ${c.green}🎁 AIRDROP   ${c.reset}${progressBar(allocations.airdrop, 30)}`);
  console.log(`   ${c.yellow}💰 TREASURY  ${c.reset}${progressBar(allocations.treasury, 30)}`);
  console.log('');
  console.log(divider);
}

/**
 * Display status bar
 */
export function displayStatusBar(model: string, funds: string, mode: string): void {
  const divider = `${c.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`;
  console.log(divider);
  console.log(`${c.bright}${c.white}🧠 MODEL: ${c.cyan}${model}${c.reset} ${c.dim}│${c.reset} ${c.bright}FUNDS: ${c.green}${funds} SOL${c.reset} ${c.dim}│${c.reset} ${c.bright}MODE: ${mode === 'LIVE' ? c.green : c.yellow}${mode}${c.reset}`);
  console.log(divider);
}

/**
 * Display thinking box with message
 */
export function displayThinkingBox(message: string): void {
  const boxWidth = 57;
  const paddedMessage = message.padEnd(boxWidth - 4);

  console.log(`   ${c.dim}┌${'─'.repeat(boxWidth)}┐${c.reset}`);
  console.log(`   ${c.dim}│${c.reset}  ${c.yellow}${paddedMessage}${c.reset}  ${c.dim}│${c.reset}`);
  console.log(`   ${c.dim}└${'─'.repeat(boxWidth)}┘${c.reset}`);
}

/**
 * Display consciousness thought
 */
export function displayThought(type: string, content: string): void {
  const typeColors: Record<string, string> = {
    OBSERVING: c.blue,
    THINKING: c.yellow,
    ANALYZING: c.cyan,
    DECIDING: c.magenta,
    EXECUTING: c.green,
    EMOTION: c.red,
    IDEA: c.bright + c.white,
    TRADE: c.green,
    SYSTEM: c.dim,
  };

  const color = typeColors[type] || c.white;
  const icon = getThoughtIcon(type);

  console.log(`   ${color}${icon} [${type}]${c.reset} ${content}`);
}

function getThoughtIcon(type: string): string {
  const icons: Record<string, string> = {
    OBSERVING: '👁️ ',
    THINKING: '💭',
    ANALYZING: '📊',
    DECIDING: '🎯',
    EXECUTING: '⚡',
    EMOTION: '💫',
    IDEA: '💡',
    TRADE: '📈',
    SYSTEM: '⚙️ ',
  };
  return icons[type] || '•';
}

/**
 * Display startup banner
 */
export function displayStartupBanner(config: {
  model: string;
  token: string;
  bondingCurve: string;
  dryRun: boolean;
}): void {
  console.log(ASCII_ART.WHALEMARKET_BANNER);

  const divider = `${c.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`;

  console.log(divider);
  console.log(`${c.bright}   TOKEN:${c.reset}          ${c.cyan}${config.token}${c.reset}`);
  console.log(`${c.bright}   BONDING CURVE:${c.reset}  ${c.dim}${config.bondingCurve}${c.reset}`);
  console.log(`${c.bright}   MODEL:${c.reset}          ${c.green}${config.model}${c.reset}`);
  console.log(`${c.bright}   MODE:${c.reset}           ${config.dryRun ? `${c.yellow}DRY RUN (simulation)` : `${c.green}LIVE`}${c.reset}`);
  console.log(divider);
  console.log('');
  console.log(`${c.bright}   MODULES:${c.reset}`);
  console.log(`   ${c.cyan}├─ opus${c.reset}    │ Decision Engine (AI Brain)`);
  console.log(`   ${c.green}├─ sonnet${c.reset}  │ Volume Creation`);
  console.log(`   ${c.red}├─ haiku${c.reset}   │ Buyback & Burn`);
  console.log(`   ${c.magenta}└─ claude${c.reset}  │ Airdrop Distribution`);
  console.log('');
  console.log(divider);
  console.log('');
}

/**
 * Display the full thinking sequence with ASCII art
 */
export function displayThinkingSequence(phase: 'start' | 'analyzing' | 'deciding' | 'executing' | 'complete'): void {
  console.log('');

  switch (phase) {
    case 'start':
      console.log(ASCII_ART.THINKING);
      break;
    case 'analyzing':
      console.log(ASCII_ART.ANALYZING);
      break;
    case 'deciding':
      console.log(ASCII_ART.DECIDING);
      break;
    case 'executing':
      console.log(ASCII_ART.EXECUTING);
      break;
    case 'complete':
      console.log(ASCII_ART.COMPLETE);
      break;
  }
}

/**
 * Display decision summary
 */
export function displayDecisionSummary(decision: {
  allocations: { volume: number; buyback: number; airdrop: number; treasury: number };
  confidence: number;
  sentiment: string;
  reasoning?: string;
}): void {
  const divider = `${c.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`;

  console.log('');
  console.log(divider);
  console.log(`${c.bright}   DECISION COMPLETE${c.reset}`);
  console.log(divider);
  console.log('');

  displayAllocations(decision.allocations);

  console.log('');
  console.log(`   ${c.bright}CONFIDENCE:${c.reset}  ${getConfidenceBar(decision.confidence)}`);
  console.log(`   ${c.bright}SENTIMENT:${c.reset}   ${getSentimentDisplay(decision.sentiment)}`);

  if (decision.reasoning) {
    console.log('');
    console.log(`   ${c.dim}REASONING:${c.reset}`);
    const lines = wrapText(decision.reasoning, 65);
    lines.forEach(line => {
      console.log(`   ${c.dim}${line}${c.reset}`);
    });
  }

  console.log('');
  console.log(divider);
}

function getConfidenceBar(confidence: number): string {
  const color = confidence >= 80 ? c.green : confidence >= 60 ? c.yellow : c.red;
  return `${color}${progressBar(confidence, 20)}${c.reset}`;
}

function getSentimentDisplay(sentiment: string): string {
  const sentimentColors: Record<string, string> = {
    bullish: c.green,
    bearish: c.red,
    neutral: c.yellow,
  };
  const icons: Record<string, string> = {
    bullish: '📈',
    bearish: '📉',
    neutral: '➡️ ',
  };
  const color = sentimentColors[sentiment] || c.white;
  const icon = icons[sentiment] || '•';
  return `${icon} ${color}${sentiment.toUpperCase()}${c.reset}`;
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxWidth) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Clear terminal and reset cursor
 */
export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

/**
 * Display a separator line
 */
export function separator(): void {
  console.log(`${c.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
}

export default {
  ASCII_ART,
  progressBar,
  displayAllocations,
  displayStatusBar,
  displayThinkingBox,
  displayThought,
  displayStartupBanner,
  displayThinkingSequence,
  displayDecisionSummary,
  clearScreen,
  separator,
};
