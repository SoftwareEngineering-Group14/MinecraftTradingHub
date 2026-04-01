"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch('/api/v1/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to sign up');
        setLoading(false);
        return;
      }

      router.push('/onboarding/username');

    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-5 w-full">
      <div className="text-center">
        <h2 className="font-press-start text-sm leading-loose mb-1" style={{ color: '#FFF0D0' }}>REGISTER</h2>
        <p className="font-space-mono text-[10px]" style={{ color: '#C4904A' }}>Create your player profile</p>
      </div>

      {error && <p className="error-message-dark">{error}</p>}

      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mc-auth-input-dark"
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mc-auth-input-dark"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mc-auth-input-dark"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="btn-green">
        {loading ? 'CREATING...' : 'CREATE PROFILE'}
      </button>
    </form>
  );
}
