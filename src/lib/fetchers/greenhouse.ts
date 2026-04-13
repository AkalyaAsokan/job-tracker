import { isSdeRole } from './sde-filter';
import { isUsLocation } from './us-filter';

export interface NormalizedJob {
  externalId: string;
  title: string;
  location: string | null;
  url: string;
  postedAt: string | null;
  source: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  updated_at: string;
  absolute_url: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

export async function fetchGreenhouseJobs(slug: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    console.error(`Greenhouse [${slug}] HTTP ${res.status}`);
    return [];
  }

  const data: GreenhouseResponse = await res.json();

  return data.jobs
    .filter(job => isSdeRole(job.title) && isUsLocation(job.location?.name))
    .map(job => ({
      externalId: `gh-${slug}-${job.id}`,
      title: job.title,
      location: job.location?.name || null,
      url: job.absolute_url,
      postedAt: job.updated_at || null,
      source: 'Greenhouse',
    }));
}
