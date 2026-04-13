import { isSdeRole } from './sde-filter';
import { isUsLocation } from './us-filter';
import type { NormalizedJob } from './greenhouse';

interface LeverPosting {
  id: string;
  text: string;
  categories: { location?: string };
  hostedUrl: string;
  createdAt: number;
}

export async function fetchLeverJobs(slug: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${slug}?mode=json`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    console.error(`Lever [${slug}] HTTP ${res.status}`);
    return [];
  }

  const data: LeverPosting[] = await res.json();

  return data
    .filter(p => isSdeRole(p.text) && isUsLocation(p.categories?.location))
    .map(p => ({
      externalId: `lv-${slug}-${p.id}`,
      title: p.text,
      location: p.categories?.location || null,
      url: p.hostedUrl,
      postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      source: 'Lever',
    }));
}
