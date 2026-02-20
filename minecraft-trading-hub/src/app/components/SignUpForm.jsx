"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to sign up');
        setLoading(false);
        return;
      }

      router.refresh();
      router.push('/onboarding/username');
      
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-6 w-full max-w-sm">
      <div className="text-center">
        <h2 className="text-2xl font-press-start text-green-800 uppercase">Register</h2>
        <p className="font-space-mono text-gray-500 text-xs mt-2">Create your player profile</p>
      </div>

      {error && (
        <p className="text-red-500 font-space-mono text-xs text-center p-2 bg-red-50 border border-red-200 rounded">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Display Name (e.g. Steve)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-4 border-2 border-green-100 rounded-xl font-space-mono focus:outline-none focus:border-green-700 transition-colors"
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 border-2 border-green-100 rounded-xl font-space-mono focus:outline-none focus:border-green-700 transition-colors"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 border-2 border-green-100 rounded-xl font-space-mono focus:outline-none focus:border-green-700 transition-colors"
          required
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-4 bg-green-700 text-white font-press-start rounded-lg hover:bg-green-800 transition-all shadow-md disabled:bg-gray-400 text-sm"
      >
        {loading ? 'CREATING ACCOUNT...' : 'CREATE PROFILE'}
      </button>
    </form>
  );
}