# Job Tracker

A personal job application tracker that aggregates listings from top tech companies in one place. Instead of checking 10 different career pages, this pulls everything into a single dashboard where you can save, track, and manage applications.

## Features

- **Multi-source aggregation** — fetches listings from Greenhouse, Lever, LinkedIn, and Adzuna
- **10 target companies** — Google, Amazon, Meta, Netflix, Uber, OpenAI, DoorDash, Stripe, Airbnb, Anthropic
- **Keyword match scoring** — enter keywords and jobs are ranked by how well they match your skills
- **Status tracking** — move jobs through `new → saved → applied → dismissed`
- **Top 5 dashboard** — highlights the best-matched open roles across all companies
- **Auto-refresh** — one click to pull the latest listings and see what's new
- **Notes** — add notes to any job listing

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **SQLite** (via `better-sqlite3`) — local database, no backend needed
- **Tailwind CSS**
- **Playwright** — for LinkedIn scraping

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first load, click **Refresh** to fetch current listings from all sources. Jobs are stored locally in `data/jobs.db`.

## Project Structure

```
src/
  app/
    page.tsx              # Main dashboard UI
    api/
      jobs/               # CRUD for job listings
      refresh/            # Triggers a full fetch across all sources
      autofill/           # Keyword-based match scoring
      top5/               # Returns top-matched jobs
  components/
    JobCard.tsx           # Individual job listing card
    Top5Tab.tsx           # Top 5 matches view
  lib/
    companies.ts          # Company config (fetcher type, colors, IDs)
    jobFetcher.ts         # Orchestrates fetching across all sources
    db.ts                 # SQLite schema and connection
    fetchers/
      greenhouse.ts
      lever.ts
      linkedin.ts
      adzuna.ts
```

## Adding Companies

Edit `src/lib/companies.ts` and add an entry:

```ts
{
  id: 'your-company',
  name: 'Your Company',
  fetcher: 'greenhouse',   // or 'lever' | 'linkedin-id' | 'linkedin-kw' | 'adzuna'
  slug: 'your-company',
  color: '#000000',
  bg: '#F5F5F5',
}
```
