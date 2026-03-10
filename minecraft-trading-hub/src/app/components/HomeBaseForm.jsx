"use client";
import { useRouter } from 'next/navigation';

export default function HomeBaseForm() {
  const router = useRouter();

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="card">
        <h2 className="text-xl font-bold">Hit this button to see your profile!</h2>
      
        <button 
          type="button"
          onClick={() => router.push('/home/profile')}
          className="green-button"
        >
         View Profile
        </button>
      </div>
    </div>
  );
}