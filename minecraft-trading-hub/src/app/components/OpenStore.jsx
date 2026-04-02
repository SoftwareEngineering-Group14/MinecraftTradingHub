"use client";
import { useRouter } from 'next/navigation';
export default function OpenStore() {
  const router = useRouter();
  return(
    <div className="flex flex-col">
        <button className="green-button"
            onClick={() => router.push('/home/dashboard')}
        >
        Back
        </button>
    <div className="card-container flex-row">
        
        <div className="card flex-1">
            <h1 className="heading-pixel text-center">In-game Inventory</h1>
        </div>
        <div className="card-container flex-col">
            <div className="card flex-1">
                <h1 className="heading-pixel text-center">Offer</h1>
            </div>
            <div className="card flex-1">
                <h1 className="heading-pixel text-center">Ask</h1>
            </div>
        </div>
        <div className="card flex-1">
            <h1 className="heading-pixel text-center">Listings</h1>
        </div>
    </div>
    </div>

  );
}