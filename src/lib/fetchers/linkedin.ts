import { isSdeRole } from './sde-filter';
import { isUsLocation } from './us-filter';
import type { NormalizedJob } from './greenhouse';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parseJobs(html: string, companyLabel: string): NormalizedJob[] {
  const jobs: NormalizedJob[] = [];

  // Split by job card
  const cards = html.split('data-entity-urn=').slice(1);

  for (const card of cards) {
    const idMatch = card.match(/urn:li:jobPosting:(\d+)/);
    const titleMatch = card.match(/base-search-card__title[^>]*>\s*([\s\S]*?)\s*<\/h3>/);
    const locationMatch = card.match(/job-search-card__location[^>]*>\s*([\s\S]*?)\s*<\/span>/);
    const linkMatch = card.match(/href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"?]+)/);
    const timeMatch = card.match(/datetime="([^"]+)"/);

    if (!idMatch || !titleMatch || !linkMatch) continue;

    const title = titleMatch[1].trim().replace(/\s+/g, ' ');
    const location = locationMatch?.[1]?.trim().replace(/\s+/g, ' ') || null;
    const url = linkMatch[1];
    const postedAt = timeMatch ? new Date(timeMatch[1]).toISOString() : null;

    if (!isSdeRole(title)) continue;
    if (!isUsLocation(location)) continue;

    jobs.push({
      externalId: `li-${companyLabel}-${idMatch[1]}`,
      title,
      location,
      url,
      postedAt,
      source: 'LinkedIn',
    });
  }

  return jobs;
}

export async function fetchLinkedInByCompanyId(
  companyId: number,
  companyLabel: string
): Promise<NormalizedJob[]> {
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=software+engineer&location=United+States&f_C=${companyId}&start=0`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
    if (!res.ok) {
      console.error(`LinkedIn [${companyLabel}] HTTP ${res.status}`);
      return [];
    }
    return parseJobs(await res.text(), companyLabel);
  } catch (err) {
    console.error(`LinkedIn [${companyLabel}] error:`, err);
    return [];
  }
}

export async function fetchLinkedInByKeyword(
  companyName: string,
  companyLabel: string
): Promise<NormalizedJob[]> {
  const kw = encodeURIComponent(`software engineer ${companyName}`);
  const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${kw}&location=United+States&start=0`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
    if (!res.ok) {
      console.error(`LinkedIn keyword [${companyLabel}] HTTP ${res.status}`);
      return [];
    }
    return parseJobs(await res.text(), companyLabel);
  } catch (err) {
    console.error(`LinkedIn keyword [${companyLabel}] error:`, err);
    return [];
  }
}
