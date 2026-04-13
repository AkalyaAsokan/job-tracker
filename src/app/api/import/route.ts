import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createHash } from 'crypto';
import { COMPANIES, COMPANY_MAP } from '@/lib/companies';

function stableId(s: string) {
  return createHash('md5').update(s).digest('hex').slice(0, 16);
}

function detectCompanyFromUrl(url: string): string {
  const lower = url.toLowerCase();
  for (const c of COMPANIES) {
    if (lower.includes(c.id) || lower.includes(c.name.toLowerCase())) return c.id;
  }
  return 'other';
}

function detectSourceFromUrl(url: string): string {
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('greenhouse.io')) return 'Greenhouse';
  if (url.includes('lever.co')) return 'Lever';
  if (url.includes('workday.com') || url.includes('myworkdayjobs')) return 'Workday';
  if (url.includes('ashbyhq.com')) return 'Ashby';
  return 'Manual';
}

export async function POST(request: Request) {
  const { url, title, company_id, location } = await request.json();

  if (!url || !title) {
    return NextResponse.json({ error: 'url and title are required' }, { status: 400 });
  }

  const companyId = company_id || detectCompanyFromUrl(url);
  const company = COMPANY_MAP[companyId];
  const companyName = company?.name || companyId;
  const source = detectSourceFromUrl(url);
  const now = new Date().toISOString();
  const id = stableId(`manual-${url}-${title}`);

  db.prepare(`
    INSERT OR IGNORE INTO jobs
      (id, company_id, company_name, title, location, url, posted_at, fetched_at, status, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'saved', ?, '')
  `).run(id, companyId, companyName, title, location || null, url, now, now, source);

  return NextResponse.json({ success: true, id });
}
