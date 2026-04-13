'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import JobCard, { Job } from '@/components/JobCard';
import Top5Tab from '@/components/Top5Tab';
import { COMPANIES } from '@/lib/companies';

type MainTab = 'jobs' | 'top5';
type StatusFilter = 'all' | 'new' | 'saved' | 'applied' | 'dismissed';

interface Counts { new: number; saved: number; applied: number; dismissed: number }
interface LastRefresh { refreshed_at: string; jobs_new: number }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function computeMatchScore(job: Job, keywords: string[]): number {
  if (!keywords.length) return 0;
  const haystack = `${job.title} ${job.company_name}`.toLowerCase();
  const matched = keywords.filter(kw => haystack.includes(kw.toLowerCase()));
  return Math.round((matched.length / keywords.length) * 100);
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1);
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Counts>({ new: 0, saved: 0, applied: 0, dismissed: 0 });
  const [total, setTotal] = useState(0);
  const [mainTab, setMainTab] = useState<MainTab>('jobs');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ found: number; added: number } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<LastRefresh | null>(null);
  const [company, setCompany] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [resumeKeywords, setResumeKeywords] = useState('');
  const [showResumePanel, setShowResumePanel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importTitle, setImportTitle] = useState('');
  const [importCompany, setImportCompany] = useState('');
  const [importing, setImporting] = useState(false);
  const searchRef = useRef<NodeJS.Timeout>();

  const parsedKeywords = parseKeywords(resumeKeywords);

  const fetchJobs = useCallback(async (searchVal?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (company !== 'all') params.set('company', company);
    if (status !== 'all') params.set('status', status);
    const sq = searchVal !== undefined ? searchVal : search;
    if (sq) params.set('search', sq);
    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();
    setJobs(data.jobs || []);
    const cm: Record<string, number> = {};
    for (const c of (data.counts || [])) cm[c.status] = c.count;
    setCounts({ new: cm.new || 0, saved: cm.saved || 0, applied: cm.applied || 0, dismissed: cm.dismissed || 0 });
    setTotal(data.total || 0);
    setLoading(false);
  }, [company, status, search]);

  const fetchLastRefresh = useCallback(async () => {
    const res = await fetch('/api/refresh');
    setLastRefresh((await res.json()).lastRefresh);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => { fetchLastRefresh(); }, [fetchLastRefresh]);

  // Load saved resume keywords from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('resumeKeywords');
    if (saved) setResumeKeywords(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem('resumeKeywords', resumeKeywords);
  }, [resumeKeywords]);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => fetchJobs(val), 350);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    const res = await fetch('/api/refresh', { method: 'POST' });
    const data = await res.json();
    setRefreshing(false);
    if (data.success) {
      setRefreshResult({ found: data.found, added: data.added });
      await fetchLastRefresh();
      await fetchJobs();
    }
  };

  const handleStatusChange = async (id: string, newStatus: Job['status']) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: newStatus } : j));
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (newStatus === 'dismissed') {
      setTimeout(() => setJobs(prev => prev.filter(j => j.id !== id)), 300);
    }
  };

  const handleNotesChange = async (id: string, notes: string) => {
    await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  };

  const handleImport = async () => {
    if (!importUrl || !importTitle) return;
    setImporting(true);
    await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: importUrl, title: importTitle, company_id: importCompany || undefined }),
    });
    setImporting(false);
    setImportUrl(''); setImportTitle(''); setImportCompany('');
    setShowImport(false);
    await fetchJobs();
  };

  // Sort jobs by match score if keywords present
  const sortedJobs = parsedKeywords.length > 0
    ? [...jobs].sort((a, b) => computeMatchScore(b, parsedKeywords) - computeMatchScore(a, parsedKeywords))
    : jobs;

  const statusTabs: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All active', count: total },
    { value: 'new', label: 'New', count: counts.new },
    { value: 'saved', label: 'Saved', count: counts.saved },
    { value: 'applied', label: 'Applied', count: counts.applied },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">SDE Job Tracker</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {lastRefresh
                  ? `Last refreshed ${timeAgo(lastRefresh.refreshed_at)} · ${lastRefresh.jobs_new} new jobs added`
                  : 'Never refreshed — click Refresh to fetch jobs'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {refreshResult && (
                <span className="text-sm text-green-600 font-medium">
                  ✓ {refreshResult.added} new jobs
                </span>
              )}
              <button
                onClick={() => setShowResumePanel(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  parsedKeywords.length > 0
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                🎯 {parsedKeywords.length > 0 ? `${parsedKeywords.length} keywords` : 'Resume match'}
              </button>
              <button
                onClick={() => setShowImport(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
              >
                + Add job
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-60 transition-colors"
              >
                {refreshing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Fetching…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Resume keywords panel */}
          {showResumePanel && (
            <div className="mt-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-800 mb-1">
                    Resume keywords — jobs are ranked by match %
                  </p>
                  <p className="text-xs text-purple-600 mb-2">
                    Paste skills from your resume (comma or newline separated): Python, React, AWS, distributed systems…
                  </p>
                  <textarea
                    value={resumeKeywords}
                    onChange={e => setResumeKeywords(e.target.value)}
                    placeholder="Python, TypeScript, React, Node.js, AWS, Kubernetes, distributed systems, microservices…"
                    className="w-full text-sm border border-purple-200 rounded-lg p-2.5 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  />
                </div>
                <button onClick={() => setShowResumePanel(false)} className="text-purple-400 hover:text-purple-600 mt-1">✕</button>
              </div>
            </div>
          )}

          {/* Manual import panel */}
          {showImport && (
            <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm font-semibold text-blue-800 mb-3">Add a job manually</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="url"
                  placeholder="Job URL *"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  className="flex-1 min-w-48 text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                />
                <input
                  type="text"
                  placeholder="Job title *"
                  value={importTitle}
                  onChange={e => setImportTitle(e.target.value)}
                  className="flex-1 min-w-48 text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                />
                <select
                  value={importCompany}
                  onChange={e => setImportCompany(e.target.value)}
                  className="text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="">Company (auto-detect)</option>
                  {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  onClick={handleImport}
                  disabled={importing || !importUrl || !importTitle}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {importing ? 'Adding…' : 'Add'}
                </button>
                <button onClick={() => setShowImport(false)} className="text-blue-400 hover:text-blue-600">✕</button>
              </div>
            </div>
          )}

          {/* Main tab switcher */}
          <div className="flex items-center gap-1 mt-4 border-b border-gray-200">
            <button
              onClick={() => setMainTab('jobs')}
              className={`flex items-center gap-1.5 px-4 pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                mainTab === 'jobs'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All Jobs
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${mainTab === 'jobs' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {total}
              </span>
            </button>
            <button
              onClick={() => setMainTab('top5')}
              className={`flex items-center gap-1.5 px-4 pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                mainTab === 'top5'
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🏆 Top 5 Today
            </button>
          </div>

          {/* Status sub-tabs (only in jobs view) */}
          {mainTab === 'jobs' && (
            <div className="flex items-center gap-6 mt-3 text-sm overflow-x-auto">
              {statusTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatus(tab.value)}
                  className={`flex items-center gap-1.5 pb-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
                    status === tab.value
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      status === tab.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {mainTab === 'top5' && (
        <main className="max-w-6xl mx-auto px-4">
          <Top5Tab />
        </main>
      )}

      <main className={`max-w-6xl mx-auto px-4 py-6 ${mainTab !== 'jobs' ? 'hidden' : ''}`}>
        {/* Company + search filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCompany('all')}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                company === 'all'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              All
            </button>
            {COMPANIES.map(c => (
              <button
                key={c.id}
                onClick={() => setCompany(company === c.id ? 'all' : c.id)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors font-medium ${
                  company === c.id ? 'text-white border-transparent' : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                style={company === c.id ? { background: c.color } : { color: c.color }}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="ml-auto relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search title or location…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 w-52"
            />
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 h-44 animate-pulse">
                <div className="flex gap-2 mb-3"><div className="h-5 bg-gray-100 rounded-full w-20" /><div className="h-5 bg-gray-100 rounded-full w-16" /></div>
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && sortedJobs.length === 0 && (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-gray-700">
              {total === 0 ? 'No jobs yet' : 'No jobs match these filters'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {total === 0 ? 'Click "Refresh" above to fetch today\'s openings.' : 'Try adjusting your filters.'}
            </p>
          </div>
        )}

        {/* Job grid */}
        {!loading && sortedJobs.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-sm text-gray-500">
                {sortedJobs.length} job{sortedJobs.length !== 1 ? 's' : ''}
                {company !== 'all' ? ` at ${COMPANIES.find(c => c.id === company)?.name}` : ''}
              </p>
              {parsedKeywords.length > 0 && (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  Sorted by resume match
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedJobs.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  matchScore={parsedKeywords.length > 0 ? computeMatchScore(job, parsedKeywords) : undefined}
                  onStatusChange={handleStatusChange}
                  onNotesChange={handleNotesChange}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
