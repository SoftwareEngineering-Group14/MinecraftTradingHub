"use client";
import SignUpForm from "../../components/SignUpForm";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="auth-card">
        <SignUpForm />
        
        <div className="w-full flex flex-col items-center">
          <div className="auth-divider" />
          
          <div className="flex flex-col items-center gap-3 text-gray-700 font-space-mono text-xs">
            <div>
              Already have an account?{' '}
              <Link href="/signin" className="text-green-700 hover:underline font-press-start text-[10px]">
                Sign In
              </Link>
            </div>

            <div>
              Want to go back?{' '}
              <Link href="/" className="text-green-700 hover:underline font-press-start text-[10px]">
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}