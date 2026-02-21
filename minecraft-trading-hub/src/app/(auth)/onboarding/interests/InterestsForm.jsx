"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { INTEREST_OPTIONS } from '@/app/lib/serverConstants';

export default function InterestsForm() {
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleInterest = (interest) => {
    setSelected(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch('/api/onboarding/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: selected }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to save interests');

      router.refresh();
      router.push('/');
    } catch (err) {
      console.error("Onboarding Error:", err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="auth-card max-w-2xl">

        <div className="text-center space-y-2">
          <h1 className="heading-pixel">
            What Interests You?
          </h1>
          <p className="font-space-mono text-gray-600 text-sm">
            Select at least one tag to customize your trading experience.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {INTEREST_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleInterest(item)}
              className={`tag-option ${selected.includes(item) ? 'tag-option-active' : ''}`}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || selected.length === 0}
          className="btn-green"
        >
          {loading ? 'FINALIZING...' : 'FINISH SETUP'}
        </button>
      </div>
    </div>
  );
}
