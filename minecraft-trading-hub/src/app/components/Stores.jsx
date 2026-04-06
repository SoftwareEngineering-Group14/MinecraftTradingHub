"use client";
import { useRouter } from 'next/navigation';

export default function Stores() {
  const router = useRouter();

  return (
    <div className="flex flex-col justify-center items-center h-screen">
        <div className="flex flex-row gap-4 mb-8">
            <button className="green-button" onClick={() => router.push('/home/dashboard')}>
                Back
            </button>
            <h1 className="heading-pixel text-center mb-8">Search bar here</h1>
        </div>
      <div className="card-container flex-row">
        <div className="card flex-1">
          <h1 className="heading-pixel text-center">stores here</h1>
        </div>
      </div>
    </div>
  );
}