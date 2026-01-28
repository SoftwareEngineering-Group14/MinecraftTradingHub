import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Database file path
const dbPath = path.join(process.cwd(), 'trading_hub.db');

export async function GET(request) {
  // Check for internal API key (from header or query param)
  const apiKey = request.headers.get('x-api-key') ||
                 request.nextUrl.searchParams.get('key');
  const validKey = process.env.INTERNAL_API_KEY || 'dev-secret-key';

  if (apiKey !== validKey) {
    return NextResponse.json({
      success: false,
      error: 'Unauthorized'
    }, { status: 401 });
  }

  try {
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.close();

    return NextResponse.json({
      success: true,
      message: 'Database opened successfully',
      dbPath
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
