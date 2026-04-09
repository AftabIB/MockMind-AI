import { NextResponse } from 'next/server';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Helper to run Upstash Redis commands via REST API (no npm package needed)
async function redis(command) {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  return data.result;
}

// GET - return current visitor count
export async function GET() {
  try {
    const count = await redis(['GET', 'visitor_count']);
    return NextResponse.json({ count: parseInt(count) || 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

// POST - increment visitor count and return new value
export async function POST() {
  try {
    const count = await redis(['INCR', 'visitor_count']);
    return NextResponse.json({ count: parseInt(count) || 0 });
  } catch {
w    return NextResponse.json({ count: 0 });
  }
}
