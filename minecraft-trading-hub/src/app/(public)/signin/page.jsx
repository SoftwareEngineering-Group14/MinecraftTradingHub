"use client";
import SignInForm from "../../components/SignInForm";
import Link from "next/link";

export default function SignInPage() {
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
          <SignInForm />

          <div className="mc-auth-divider-dark" />

          <p className="font-space-mono text-[10px] text-center" style={{ color: '#C4904A' }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-green-400 hover:underline font-press-start text-[9px]"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
