import { NextResponse } from 'next/server';
import { refreshAllJobs, getLastRefresh } from '@/lib/jobFetcher';

export async function GET() {
  const last = getLastRefresh();
  return NextResponse.json({ lastRefresh: last });
}

export async function POST() {
  try {
    const result = await refreshAllJobs();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('Refresh error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
