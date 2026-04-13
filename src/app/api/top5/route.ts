import { NextResponse } from 'next/server';
import db, { Job } from '@/lib/db';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

interface ScoredJob extends Job { score: number; matchedKeywords: string[] }

// Keywords that commonly appear in job titles — used for title matching
const TITLE_ROLE_WORDS = [
  'backend', 'frontend', 'front-end', 'back-end', 'full stack', 'fullstack',
  'full-stack', 'platform', 'infrastructure', 'ml', 'machine learning',
  'data engineering', 'data engineer', 'site reliability', 'devops',
  'distributed', 'cloud', 'mobile', 'ios', 'android', 'systems',
  'python', 'java', 'javascript', 'typescript', 'react', 'node',
  'golang', 'rust', 'scala', 'c++', 'generative', 'genai', 'llm', 'ai',
];

function scoreJob(job: Job, allKeywords: string[]): { score: number; matched: string[] } {
  const title = job.title.toLowerCase();
  const company = job.company_name.toLowerCase();

  // 1. Title keyword match — only against role/tech words likely in titles
  const titleWords = allKeywords.filter(kw =>
    TITLE_ROLE_WORDS.some(tw => tw.includes(kw.toLowerCase()) || kw.toLowerCase().includes(tw))
  );
  const titleMatched = titleWords.filter(kw => title.includes(kw.toLowerCase()));

  // 2. All-keyword match (broader)
  const allMatched = allKeywords.filter(kw => title.includes(kw.toLowerCase()));

  // Score: 60% from title-role match, 20% from any keyword match, 20% base for being an SDE role
  let score = 20; // base: it passed the SDE filter already
  if (titleWords.length > 0) score += Math.round((titleMatched.length / titleWords.length) * 60);
  if (allKeywords.length > 0) score += Math.round((allMatched.length / Math.min(allKeywords.length, 15)) * 20);

  // Level fit for 3-4 YOE (SDE II / Senior level)
  if (title.includes(' ii') || title.match(/\bii\b/) || title.includes(' iii') ||
      title.includes('senior') || title.includes(' 2') || title.includes(' 3'))  score += 12;
  if (title.includes('staff') || title.includes('principal') || title.includes('director') ||
      title.includes(' vp') || title.includes('vice president'))                  score -= 25;
  if (title.includes('intern') || title.includes('new grad') || title.includes('entry') ||
      title.includes('junior') || title.match(/\bsde\s*1\b/i))                   score -= 35;

  // Strong signals from Akalya's background
  if (title.includes('quantitative') || title.includes('quant'))   score += 15;
  if (title.includes('risk') || title.includes('finance'))         score += 10;
  if (title.includes('llm') || title.includes('genai') || title.includes('generative') || title.includes('ai/ml')) score += 15;
  if (title.includes('data engineer') || title.includes('platform engineer'))     score += 10;

  // Recency boost
  const ageHours = (Date.now() - new Date(job.fetched_at).getTime()) / 3600000;
  if (ageHours < 24) score += 8;
  else if (ageHours < 48) score += 4;

  const matched = [...new Set([...titleMatched, ...allMatched])];
  return { score: Math.min(100, Math.max(0, score)), matched };
}

function loadProfile(): { keywords: string[] } {
  const profilePath = path.join(process.cwd(), 'config/profile.json');
  if (!existsSync(profilePath)) return { keywords: [] };
  try {
    return JSON.parse(readFileSync(profilePath, 'utf8'));
  } catch { return { keywords: [] }; }
}

export async function GET() {
  const { keywords } = loadProfile();

  const jobs = db.prepare(`
    SELECT * FROM jobs
    WHERE status NOT IN ('dismissed', 'applied')
    ORDER BY fetched_at DESC
    LIMIT 1000
  `).all() as Job[];

  const scored: ScoredJob[] = jobs
    .map(job => {
      const { score, matched } = scoreJob(job, keywords);
      return { ...job, score, matchedKeywords: matched };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({ jobs: scored, keywords });
}
