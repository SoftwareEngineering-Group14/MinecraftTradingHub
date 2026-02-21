import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="home-container">
      <div className="flex flex-1 justify-center items-center">
        <div className="auth-card max-w-4xl py-20">
          
          <h1 className="hero-title">
            BlockTrade
          </h1>
          
          <p className="font-space-mono text-lg text-green-900 mb-2 tracking-wide text-center">
            The ultimate Minecraft trading hub
          </p>
          
          <p className="font-space-mono text-sm text-gray-700 mb-6 text-center">
            Buy, sell, and swap blocks, items, and more with players worldwide.
          </p>
          
          <Link
            href="/signin"
            className="btn-green text-lg px-12 w-auto"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}