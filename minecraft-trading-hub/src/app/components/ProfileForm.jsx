"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';

export default function ProfileForm() {
  const router = useRouter();

  return (
    <form className="flex flex-col gap-4 w-80">
      <h2 className="text-xl font-bold">sporklover_22</h2>
      
      <button 
      type = 'button'
      onClick={() => router.push('/home')} 
      className="bg-blue-500 text-white p-2 rounded">
        Home
      </button>
    </form>
  );
}