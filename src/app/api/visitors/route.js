import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'visitors.json');

function getVisitorData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    // If file is corrupted, reset
  }
  return { count: 0 };
}

function saveVisitorData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET - return current visitor count
export async function GET() {
  const data = getVisitorData();
  return NextResponse.json({ count: data.count });
}

// POST - increment visitor count and return new value
export async function POST() {
  const data = getVisitorData();
  data.count += 1;
  saveVisitorData(data);
  return NextResponse.json({ count: data.count });
}
