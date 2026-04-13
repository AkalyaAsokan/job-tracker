import { NextResponse } from 'next/server';
import db, { Job } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  let query = `SELECT * FROM jobs WHERE 1=1`;
  const params: (string | number)[] = [];

  if (company && company !== 'all') {
    query += ` AND company_id = ?`;
    params.push(company);
  }

  if (status === 'dismissed') {
    query += ` AND status = 'dismissed'`;
  } else if (status && status !== 'all') {
    query += ` AND status = ? AND status != 'dismissed'`;
    params.push(status);
  } else {
    // default: exclude dismissed
    query += ` AND status != 'dismissed'`;
  }

  if (search) {
    query += ` AND (LOWER(title) LIKE ? OR LOWER(location) LIKE ?)`;
    const pattern = `%${search.toLowerCase()}%`;
    params.push(pattern, pattern);
  }

  query += ` ORDER BY fetched_at DESC, posted_at DESC LIMIT 300`;

  const jobs = db.prepare(query).all(...params) as Job[];

  const counts = db.prepare(
    `SELECT status, COUNT(*) as count FROM jobs GROUP BY status`
  ).all() as Array<{ status: string; count: number }>;

  const total = db.prepare(`SELECT COUNT(*) as n FROM jobs WHERE status != 'dismissed'`).get() as { n: number };

  return NextResponse.json({ jobs, counts, total: total.n });
}
