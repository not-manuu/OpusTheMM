'use client';

interface HeaderProps {
  isConnected: boolean;
}

export function Header({ isConnected }: HeaderProps) {
  return (
    <header className="pixel-header mb-10">
      <h1 className="font-pixel-headline text-base md:text-lg text-accent-red flex items-center gap-4" style={{ textShadow: '2px 2px 0 #fff' }}>
        <span className="text-2xl">&#129420;</span>
        4Reindeer Dashboard
      </h1>

      <div className="flex items-center gap-3 text-xl pulse">
        <div
          className={`w-3 h-3 ${
            isConnected ? 'bg-[#00e676]' : 'bg-[#ff3333]'
          }`}
          style={{
            boxShadow: isConnected ? '0 0 10px #00e676' : '0 0 10px #ff3333',
          }}
        />
        <span className={isConnected ? 'text-accent-green' : 'text-accent-red'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </header>
  );
}
