import { isSdeRole } from './sde-filter';
import { isUsLocation } from './us-filter';
import type { NormalizedJob } from './greenhouse';

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  created: string;
  redirect_url: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
}

export async function fetchAdzunaJobs(companyQuery: string): Promise<NormalizedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn(`Adzuna creds missing — skipping "${companyQuery}". Add to .env.local`);
    return [];
  }

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: 'software engineer',
    company: companyQuery,
    where: 'united states',
    results_per_page: '50',
    sort_by: 'date',
  });

  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    console.error(`Adzuna [${companyQuery}] HTTP ${res.status}`);
    return [];
  }

  const data: AdzunaResponse = await res.json();

  return (data.results || [])
    .filter(job => isSdeRole(job.title) && isUsLocation(job.location?.display_name))
    .map(job => ({
      externalId: `az-${companyQuery}-${job.id}`,
      title: job.title,
      location: job.location?.display_name || null,
      url: job.redirect_url,
      postedAt: job.created || null,
      source: 'Adzuna',
    }));
}
