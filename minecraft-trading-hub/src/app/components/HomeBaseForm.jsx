"use client";
import { useRouter } from 'next/navigation';

export default function HomeBaseForm() {
  const router = useRouter();

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="card-container flex-row">
        <div className="card flex-1">
          <h1 className="heading-pixel text-center">servers here</h1>
        </div>
        <div className="card flex-1">
          <h1 className="heading-pixel text-center">server info here</h1>
        </div>
      </div>
    </div>
  );
}