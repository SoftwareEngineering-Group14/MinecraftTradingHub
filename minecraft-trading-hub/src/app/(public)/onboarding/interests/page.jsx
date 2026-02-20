"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const INTEREST_OPTIONS = [
  'Redstone', 'Building', 'PvP', 'Farming', 'Trading', 'Rare Items', 'Hardcore', 'Creative'
];

export default function InterestsPage() {
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save interests');
      }

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
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4 font-space-mono">
      <div className="w-full max-w-2xl p-8 md:p-12 bg-white rounded-3xl border-4 border-green-800 shadow-2xl flex flex-col items-center gap-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-xl md:text-2xl font-press-start text-green-800 uppercase leading-relaxed">
            What Interests You?
          </h1>
          <p className="text-gray-600 text-sm">
            Select at least one tag to customize your trading experience.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {INTEREST_OPTIONS.map((item) => (
            <button
              key={item}
              type="button" 
              onClick={() => toggleInterest(item)}
              className={`p-4 border-2 rounded-xl text-xs transition-all flex items-center justify-center text-center h-16 ${
                selected.includes(item) 
                ? 'bg-green-700 border-green-900 text-white shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)]' 
                : 'bg-white border-green-100 text-green-800 hover:border-green-300 hover:bg-green-50'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || selected.length === 0}
          className="w-full py-4 bg-green-700 text-white font-press-start rounded-lg hover:bg-green-800 transition-all shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'FINALIZING...' : 'FINISH SETUP'}
        </button>
      </div>
    </div>
  );
}