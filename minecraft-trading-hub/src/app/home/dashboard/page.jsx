"use client";
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="card-container flex-row">
          <div className="card flex-1">
            <h1 className="heading-pixel text-center">store image here</h1>
            <button className="green-button w-full text-center mt-auto" 
              onClick={() => router.push('/home/stores')}
            >
              View Stores
            </button>
          </div>
          <div className="card flex-1">
            <h1 className="heading-pixel text-center">listings image here</h1>
            <button className="green-button w-full text-center mt-auto"
              onClick={() => router.push('/home/listings')}
            >
              View Listings
            </button>
          </div><div className="card flex-1">
            <h1 className="heading-pixel text-center">open store image here</h1>
            <button className="green-button w-full text-center mt-auto" 
              onClick={() => router.push('/home/openStore')}
            >
              Open a Store
            </button>
          </div>
        </div>
        
      </div>
    );
}