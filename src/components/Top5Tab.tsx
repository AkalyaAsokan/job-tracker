'use client';

import { useState, useEffect } from 'react';
import { COMPANY_MAP } from '@/lib/companies';
import { Job } from './JobCard';

interface ScoredJob extends Job {
  score: number;
  matchedKeywords: string[];
}

const SOURCE_COLORS: Record<string, string> = {
  Greenhouse: '#24a47f',
  Lever: '#3B5FF5',
  LinkedIn: '#0A66C2',
  Manual: '#6B7280',
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 45 ? '#d97706' : '#6b7280';
  return (
    <div
      className="flex items-center justify-center w-14 h-14 rounded-full border-4 shrink-0 font-bold text-lg"
      style={{ borderColor: color, color }}
    >
      {score}
    </div>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
}

export default function Top5Tab() {
  const [jobs, setJobs] = useState<ScoredJob[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillDone, setAutofillDone] = useState(false);
  const [fillingIndex, setFillingIndex] = useState<number | null>(null);

  const fetchTop5 = async () => {
    setLoading(true);
    const res = await fetch('/api/top5');
    const data = await res.json();
    setJobs(data.jobs || []);
    setKeywords(data.keywords || []);
    setLoading(false);
  };

  useEffect(() => { fetchTop5(); }, []);

  const handleAutofillAll = async () => {
    if (!jobs.length) return;
    setAutofilling(true);
    setAutofillDone(false);
    const urls = jobs.map(j => j.url);
    await fetch('/api/autofill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    setAutofilling(false);
    setAutofillDone(true);
  };

  const handleAutofillOne = async (job: ScoredJob, index: number) => {
    setFillingIndex(index);
    await fetch('/api/autofill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [job.url] }),
    });
    setFillingIndex(null);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-28 animate-pulse flex gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 shrink-0" />
            <div className="flex-1"><div className="h-4 bg-gray-100 rounded w-3/4 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-lg font-semibold text-gray-700">No matches yet</h2>
        <p className="text-gray-500 text-sm mt-1">
          {keywords.length === 0
            ? 'Resume keywords not loaded — check config/profile.json'
            : 'Refresh jobs to get fresh matches, or check that jobs are loaded.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">🏆 Top 5 matches today</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Scored using {keywords.length} keywords from your resume
          </p>
        </div>

        <div className="flex items-center gap-2">
          {autofillDone && (
            <span className="text-sm text-green-600 font-medium">✓ Chrome windows opened!</span>
          )}
          <button
            onClick={handleAutofillAll}
            disabled={autofilling}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {autofilling ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Launching Chrome…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open all 5 &amp; auto-fill
              </>
            )}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800 mb-5 flex items-center gap-2">
        <span>⚠️</span>
        <span>Forms will be pre-filled with your details — <strong>nothing will be submitted automatically</strong>. Review each tab before hitting Submit.</span>
      </div>

      {/* Job list */}
      <div className="space-y-3">
        {jobs.map((job, i) => {
          const company = COMPANY_MAP[job.company_id];
          const color = company?.color ?? '#6B7280';
          const bg = company?.bg ?? '#F9FAFB';
          const sourceColor = SOURCE_COLORS[job.source] ?? '#6B7280';

          return (
            <div
              key={job.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
            >
              {/* Rank */}
              <div className="text-2xl font-black text-gray-200 w-6 text-center shrink-0 mt-1">
                {i + 1}
              </div>

              {/* Score ring */}
              <ScoreRing score={job.score} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: bg, color }}
                  >
                    {job.company_name}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: `${sourceColor}18`, color: sourceColor }}
                  >
                    {job.source}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {timeAgo(job.posted_at || job.fetched_at)}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{job.title}</h3>

                {job.location && (
                  <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location}
                  </p>
                )}

                {/* Matched keywords */}
                {job.matchedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {job.matchedKeywords.slice(0, 6).map(kw => (
                      <span key={kw} className="text-xs bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-medium">
                        {kw}
                      </span>
                    ))}
                    {job.matchedKeywords.length > 6 && (
                      <span className="text-xs text-gray-400">+{job.matchedKeywords.length - 6} more</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                    style={{ background: color }}
                  >
                    View job →
                  </a>
                  <button
                    onClick={() => handleAutofillOne(job, i)}
                    disabled={fillingIndex === i}
                    className="text-xs px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors font-medium flex items-center gap-1.5"
                  >
                    {fillingIndex === i ? (
                      <>
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Opening…
                      </>
                    ) : '⚡ Open & auto-fill'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        Scores use {keywords.length} resume keywords · Edit <code>config/profile.json</code> to update keywords
      </p>
    </div>
  );
}
