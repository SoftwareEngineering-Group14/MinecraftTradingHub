"use client";
import SignUpForm from "../../components/SignUpForm";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="mc-auth-page">

      {/* Logo above panel */}
      <div className="text-center mb-6">
        <p className="font-press-start text-4xl text-green-400 mb-3">⛏</p>
        <h1 className="font-press-start text-sm text-green-400 leading-loose">
          TRADING HUB
        </h1>
      </div>

      {/* Auth panel */}
      <div className="mc-auth-panel">
        <div className="mc-auth-panel-accent" />
        <div className="mc-auth-panel-body">
          <SignUpForm />

          <div className="mc-auth-divider-dark" />

          <div className="flex flex-col items-center gap-2">
            <p className="font-space-mono text-[10px] text-center" style={{ color: '#C4904A' }}>
              Already have an account?{' '}
              <Link
                href="/signin"
                className="text-green-400 hover:underline font-press-start text-[9px]"
              >
                Sign In
              </Link>
            </p>
            <p className="font-space-mono text-[10px] text-center" style={{ color: '#C4904A' }}>
              Want to go back?{' '}
              <Link
                href="/"
                className="text-green-400 hover:underline font-press-start text-[9px]"
              >
                Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
