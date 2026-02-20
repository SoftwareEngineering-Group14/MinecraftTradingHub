"use client";
import SignUpForm from "../../components/SignUpForm";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-xl p-12 bg-white/95 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-8" style={{ boxShadow: '0 12px 32px 0 rgba(34,139,34,0.18)' }}>
        <SignUpForm />
        <div className="w-full flex flex-col items-center">
          <div className="w-1/4 h-0 border-t-2 border-green-700 mb-4 opacity-10" />
          <div className="text-gray-700 font-space-mono text-xs">
            Want to go back?{' '}
            <Link
              href="/"
              className="text-green-700 hover:underline font-press-start"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}