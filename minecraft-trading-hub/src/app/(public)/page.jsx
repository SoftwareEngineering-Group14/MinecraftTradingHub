import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[url('/minecraft-bg.png')] bg-repeat font-space-mono">
      <div className="flex flex-1 justify-center items-center">
        <div className="rounded-[2.5rem] shadow-2xl pt-20 pb-20 px-12 flex flex-col items-center gap-8 max-w-4xl w-full overflow-visible" style={{ boxShadow: '0 12px 32px 0 rgba(34,139,34,0.18)' }}>
          <h1
            className="text-7xl font-press-start mb-4 bg-[url('/minecraft.png')] bg-clip-text text-transparent drop-shadow-lg"
            style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.3, transform: 'scaleY(1.3)', backgroundPosition: 'center' }}
          >
            BlockTrade
          </h1>
          <p className="text-lg font-space-mono text-green-900 mb-2 tracking-wide">The ultimate Minecraft trading hub</p>
          <p className="text-sm font-space-mono text-gray-700 mb-6">Buy, sell, and swap blocks, items, and more with players worldwide.</p>
          <Link
            href="/signin"
            className="px-8 py-3 bg-green-700 text-white font-press-start rounded-lg border-2 border-green-900 hover:bg-green-800 transition-all shadow-md text-lg"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
