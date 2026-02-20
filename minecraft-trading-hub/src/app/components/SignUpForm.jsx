"use client";
import { useState } from "react";
import { useRouter } from "next/navigation"; // Import the router

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter(); // Initialize the router

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to sign up');
        setLoading(false);
        return;
      }

      setSuccess("Account created successfully!");
      
      setTimeout(() => {
        router.push('/onboarding/username');
      }, 1500);

    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-6 w-full">
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
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-4 border-2 border-green-700 rounded-lg font-space-mono focus:outline-none focus:ring-2 focus:ring-green-500"
        required
      />

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
        placeholder="Choose Password"
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
        {loading ? "CREATING..." : "SIGN UP"}
      </button>
    </form>
  );
}