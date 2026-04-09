import Link from 'next/link';
import SignUpForm from '../components/SignUpForm';
import SignInForm from '../components/SignInForm';

export default function HomePage() {
  return (
    <div className="page-container flex-col items-center justify-center">
      
      {/* Wooden Sign Background Container */}
      <div className="
        bg-[url('/minecraft_sign.jpg')] 
        bg-cover 
        bg-center 
        px-8 
        py-4 
        mb-8 
        border-4 
        border-[#3b2511] 
        shadow-[0_10px_15px_-3px_rgba(0,0,0,0.7)]
      ">
        {/* We keep your original hero-title class here so the text keeps its internal texture! */}
        <h1 className="hero-title text-3xl md:text-6xl">
          Minecraft Trading Hub
        </h1>
      </div>

      <div className="card-container flex-row">
        <div className="card">
          <SignInForm />
        </div>

        <SignUpForm />
      </div>
    </div>
  );
}