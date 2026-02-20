"use client";
import SignInForm from "../../components/SignInForm";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="auth-card">

        <SignInForm />
        
        <div className="w-full flex flex-col items-center">
          <div className="auth-divider" />
          
          <div className="text-gray-700 font-space-mono text-xs">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="text-green-700 hover:underline font-press-start text-[10px]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}