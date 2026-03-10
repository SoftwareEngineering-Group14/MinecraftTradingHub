"use client";
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1 className="heading-pixel">
          Minecraft Trading Hub
        </h1>
        
        <p className="font-space-mono text-gray-600 text-center">
          Welcome to your protected dashboard, Player!
        </p>

        <div className="auth-divider" />

        <div className="flex flex-wrap justify-center gap-4 w-full max-w-md">
          <Link href="/signup" 
          color="#8fca5c" 
          className="btn-green flex-1 text-center">
            Sign Up
          </Link>

          <Link href="/signin" 
          color="#8fca5c" 
          className="btn-green flex-1 text-center">
            Sign In
          </Link>
          
          {/* Using a secondary style for the dashboard link if needed */}
          <Link href="/dashboard" 
          color="#8fca5c" 
          className="btn-green flex-1 text-center opacity-80">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}