'use client';

import { useState, useRef } from 'react';
import { COMPANY_MAP } from '@/lib/companies';

export interface Job {
  id: string;
  company_id: string;
  company_name: string;
  title: string;
  location: string | null;
  url: string;
  posted_at: string | null;
  fetched_at: string;
  status: 'new' | 'saved' | 'applied' | 'dismissed';
  source: string;
  notes: string;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 30) return `${Math.floor(days / 30)}mo ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'just now';
}

const SOURCE_COLORS: Record<string, string> = {
  Greenhouse: '#24a47f',
  Lever: '#3B5FF5',
  LinkedIn: '#0A66C2',
  Adzuna: '#E74C3C',
  Manual: '#6B7280',
};

interface Props {
  job: Job;
  matchScore?: number; // 0-100, from resume keyword matching
  onStatusChange: (id: string, status: Job['status']) => void;
  onNotesChange: (id: string, notes: string) => void;
}

export default function JobCard({ job, matchScore, onStatusChange, onNotesChange }: Props) {
  const company = COMPANY_MAP[job.company_id];
  const color = company?.color ?? '#6B7280';
  const bg = company?.bg ?? '#F9FAFB';
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(job.notes || '');
  const saveTimeout = useRef<NodeJS.Timeout>();
  const sourceColor = SOURCE_COLORS[job.source] ?? '#6B7280';

  const handleNotes = (val: string) => {
    setNotes(val);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => onNotesChange(job.id, val), 600);
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${
        job.status === 'applied' ? 'opacity-70' : ''
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
            style={{ background: bg, color }}
          >
            {job.company_name}
          </span>
          {/* Source badge */}
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
            style={{ background: `${sourceColor}18`, color: sourceColor }}
          >
            {job.source}
          </span>
          {job.status === 'saved' && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Saved</span>
          )}
          {job.status === 'applied' && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Applied</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {matchScore !== undefined && matchScore > 0 && (
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                matchScore >= 70 ? 'bg-green-100 text-green-700' :
                matchScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-500'
              }`}
              title="Resume match score"
            >
              {matchScore}%
            </span>
          )}
          <span className="text-xs text-gray-400">{timeAgo(job.posted_at || job.fetched_at)}</span>
        </div>
      </div>

      {/* Title + location */}
      <div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{job.title}</h3>
        {job.location && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {job.location}
          </p>
        )}
      </div>

      {/* Notes (expandable) */}
      {showNotes && (
        <textarea
          value={notes}
          onChange={e => handleNotes(e.target.value)}
          placeholder="Add notes (auto-saved)…"
          className="text-xs border border-gray-200 rounded-lg p-2 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-gray-300 text-gray-700"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ background: color }}
        >
          Apply →
        </a>

        <button
          onClick={() => onStatusChange(job.id, job.status === 'saved' ? 'new' : 'saved')}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            job.status === 'saved'
              ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
              : 'border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600'
          }`}
        >
          {job.status === 'saved' ? '★' : '☆'}
        </button>

        <button
          onClick={() => onStatusChange(job.id, job.status === 'applied' ? 'new' : 'applied')}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            job.status === 'applied'
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600'
          }`}
        >
          ✓
        </button>

        <button
          onClick={() => setShowNotes(v => !v)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            notes || showNotes
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-500'
          }`}
          title="Notes"
        >
          {notes ? '📝' : '🖊'}
        </button>

        <button
          onClick={() => onStatusChange(job.id, 'dismissed')}
          className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400 transition-colors ml-auto"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
