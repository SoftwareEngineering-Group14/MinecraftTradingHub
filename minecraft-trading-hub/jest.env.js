// Runs before any module is imported — ensures env vars are available
// even when next/jest loads .env files after this point.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
