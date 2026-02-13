import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to the Minecraft Trading Hub</h1>
        <p className="text-lg text-gray-700 mb-6">Your one-stop destination for all Minecraft trading needs!</p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign Up
          </Link>

          <Link
            href="/signin"
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
