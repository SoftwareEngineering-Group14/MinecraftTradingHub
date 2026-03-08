"use client";
import { useRouter } from 'next/navigation';

export default function HomeBaseForm() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 w-80">
      <h2 className="text-xl font-bold">Hit this button to see your profile!</h2>
      
      <button 
        type="button"
        onClick={() => router.push('/home/profile')}
        className="bg-blue-500 text-white p-2 rounded"
      >
        View Profile
      </button>
    </div>
  );
}