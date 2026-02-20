"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to sign in');
        setLoading(false);
        return;
      }

      setSuccess("Welcome back!");

      // 1. Logic to check if onboarding is complete
      // We check if the user has a username set in their profile
      const userProfile = data.session?.user?.user_metadata;
      
      setTimeout(() => {
        // If they don't have a username yet, send them to onboarding
        if (!userProfile?.username) {
          router.push('/onboarding/username');
        } else {
          router.push('/dashboard');
        }
      }, 1000);

    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-6 w-full">
      {error && (
        <p className="text-red-500 font-space-mono text-xs text-center bg-red-50 p-2 rounded border border-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="text-green-600 font-space-mono text-xs text-center bg-green-50 p-2 rounded border border-green-200">
          {success}
        </p>
      )}

      <input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-4 border-2 border-green-700 rounded-lg font-space-mono focus:outline-none focus:ring-2 focus:ring-green-500"
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-4 border-2 border-green-700 rounded-lg font-space-mono focus:outline-none focus:ring-2 focus:ring-green-500"
        required
      />

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-4 bg-green-700 text-white font-press-start rounded-lg hover:bg-green-800 transition-all shadow-md text-sm disabled:bg-gray-400"
      >
        {loading ? "AUTHENTICATING..." : "LOG IN"}
      </button>
    </form>
  );
}