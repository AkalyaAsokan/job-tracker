import { COMPANIES } from './companies';
import { fetchGreenhouseJobs } from './fetchers/greenhouse';
import { fetchLeverJobs } from './fetchers/lever';
import { fetchAdzunaJobs } from './fetchers/adzuna';
import { fetchLinkedInByCompanyId, fetchLinkedInByKeyword } from './fetchers/linkedin';
import db from './db';
import { createHash } from 'crypto';

function stableId(externalId: string): string {
  return createHash('md5').update(externalId).digest('hex').slice(0, 16);
}

export interface RefreshResult {
  found: number;
  added: number;
  byCompany: Record<string, { found: number; added: number; source: string }>;
}

export async function refreshAllJobs(): Promise<RefreshResult> {
  const now = new Date().toISOString();
  let totalFound = 0;
  let totalAdded = 0;
  const byCompany: Record<string, { found: number; added: number; source: string }> = {};
  type SourceLabel = string;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO jobs
      (id, company_id, company_name, title, location, url, posted_at, fetched_at, status, source, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, '')
  `);

  for (const company of COMPANIES) {
    let jobs: Awaited<ReturnType<typeof fetchGreenhouseJobs>> = [];
    let sourceLabel: string = company.fetcher;

    try {
      switch (company.fetcher) {
        case 'greenhouse':
          jobs = await fetchGreenhouseJobs(company.slug!);
          sourceLabel = 'Greenhouse';
          break;
        case 'lever':
          jobs = await fetchLeverJobs(company.slug!);
          sourceLabel = 'Lever';
          break;
        case 'adzuna':
          jobs = await fetchAdzunaJobs(company.adzunaQuery!);
          sourceLabel = 'Adzuna';
          break;
        case 'linkedin-id':
          jobs = await fetchLinkedInByCompanyId(company.linkedInId!, company.id);
          sourceLabel = 'LinkedIn';
          break;
        case 'linkedin-kw':
          jobs = await fetchLinkedInByKeyword(company.linkedInKw!, company.id);
          sourceLabel = 'LinkedIn';
          break;
      }
    } catch (err) {
      console.error(`Error fetching ${company.name}:`, err);
    }

    let added = 0;
    for (const job of jobs) {
      const id = stableId(job.externalId);
      const result = insert.run(
        id, company.id, company.name,
        job.title, job.location, job.url,
        job.postedAt, now, job.source
      );
      if (result.changes > 0) added++;
    }

    byCompany[company.id] = { found: jobs.length, added, source: sourceLabel };
    totalFound += jobs.length;
    totalAdded += added;
    console.log(`  ${company.name} [${sourceLabel}]: ${jobs.length} found, ${added} new`);
  }

  db.prepare(`INSERT INTO refresh_log (refreshed_at, jobs_found, jobs_new) VALUES (?, ?, ?)`)
    .run(now, totalFound, totalAdded);

  return { found: totalFound, added: totalAdded, byCompany };
}

export function getLastRefresh(): { refreshed_at: string; jobs_new: number } | null {
  return db.prepare(
    `SELECT refreshed_at, jobs_new FROM refresh_log ORDER BY id DESC LIMIT 1`
  ).get() as { refreshed_at: string; jobs_new: number } | null;
}
