"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch('/api/v1/signin', {
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

      router.refresh();

      const hasCompletedOnboarding = data.profile?.username || data.session?.user?.user_metadata?.username;

      if (hasCompletedOnboarding) {
        router.push('/'); 
      } else {
        router.push('/onboarding/username');
      }

    } catch (err) {
      console.error("SignIn Error:", err);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-6 w-full max-w-sm">
      <div className="text-center">
        <h2 className="heading-pixel">Login</h2>
        <p className="font-space-mono text-gray-500 text-xs mt-2">Enter the Trading Hub</p>
      </div>

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
          required
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="btn-green"
      >
        {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
      </button>
    </form>
  );
}