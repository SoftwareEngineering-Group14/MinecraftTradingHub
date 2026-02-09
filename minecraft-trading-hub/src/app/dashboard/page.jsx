import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-6 bg-gray-100">
      <h1 className="text-3xl font-bold">Minecraft Trading Hub</h1>
      <p className="text-lg text-gray-700">
        Your one-stop destination for all Minecraft trading needs!
      </p>

      <div className="flex gap-4">
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

        <Link
          href="/dashboard"
          className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
