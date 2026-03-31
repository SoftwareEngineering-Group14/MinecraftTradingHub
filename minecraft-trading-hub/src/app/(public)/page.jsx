import Link from 'next/link';
import SignUpForm from '../components/SignUpForm';
import SignInForm from '../components/SignInForm';
import { Sign } from 'node:crypto';

export default function HomePage() {
  return (
    <div className="page-container flex-col items-center justify-center">
      <h1 className="hero-title">
        Minecraft Trading Hub
      </h1>

      <div className="card-container flex-row">
        <div className="card">
          
          <SignInForm />
        </div>

        <SignUpForm />
      </div>
    </div>
  );
}