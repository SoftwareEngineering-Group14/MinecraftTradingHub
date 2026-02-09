"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    // 1️⃣ Create Supabase Auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // 2️⃣ Insert profile row with default role 'member'
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert([
        {
          id: authData.user.id,
          role: "member",
          username: cleanEmail.split("@")[0],
        },
      ]);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setSuccess("Account created! Check your email for confirmation.");
    setEmail("");
    setPassword("");
  };

  return (
    <form onSubmit={handleSignUp} className="flex flex-col gap-4 w-80">
      <h2 className="text-xl font-bold">Sign Up</h2>

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 rounded"
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 rounded"
        required
      />

      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Sign Up
      </button>
    </form>
  );
}
