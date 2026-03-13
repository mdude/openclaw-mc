'use client';
import { useEffect, useState } from 'react';

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  agentId?: string;
  sessionKey?: string;
  createdAtMs?: number;
  updatedAtMs?: number;
  deleteAfterRun?: boolean;
  sessionTarget?: string;
  wakeMode?: string;
  schedule: {
    kind: string;
    expr?: string;
    tz?: string;
    at?: string;
    everyMs?: number;
  };
  payload?: {
    kind: string;
    message?: string;
    timeoutSeconds?: number;
  };
  delivery?: {
    mode: string;
    channel?: string;
    to?: string;
    bestEffort?: boolean;
  };
  state?: {
    lastRunAtMs?: number;
    lastStatus?: string;
    lastDurationMs?: number;
    lastError?: string;
    consecutiveErrors?: number;
    nextRunAtMs?: number;
  };
}

function channelName(sessionKey?: string): string | null {
  if (!sessionKey) return null;
  const match = sessionKey.match(/discord:channel:(\d+)/);
  return match ? match[1] : null;
}

function formatDate(ms?: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatSchedule(s: CronJob['schedule']): string {
  if (s.kind === 'cron') return `${s.expr || '?'}${s.tz ? ` (${s.tz})` : ''}`;
  if (s.kind === 'at') return `Once at ${s.at || '?'}`;
  if (s.kind === 'every') return `Every ${(s.everyMs || 0) / 1000}s`;
  return s.kind;
}

const STATUS_COLORS: Record<string, string> = {
  ok: 'text-green-400',
  error: 'text-red-400',
};

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('enabled');

  useEffect(() => {
    fetch('/missioncontrol/api/cron')
      .then(r => r.ok ? r.json() : [])
      .then(d => Array.isArray(d) ? setJobs(d) : setJobs([]));
  }, []);

  const filtered = jobs.filter(j => {
    if (filter === 'enabled') return j.enabled;
    if (filter === 'disabled') return !j.enabled;
    return true;
  });

  const enabledCount = jobs.filter(j => j.enabled).length;
  const errorCount = jobs.filter(j => j.enabled && j.state?.lastStatus === 'error').length;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Cron Jobs</h2>
        <div className="flex gap-2">
          <select value={filter} onChange={e => setFilter(e.target.value as any)}
            className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1">
            <option value="enabled">Enabled ({enabledCount})</option>
            <option value="all">All ({jobs.length})</option>
            <option value="disabled">Disabled ({jobs.length - enabledCount})</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <span className="text-xs bg-purple-900/40 text-purple-300 px-3 py-1 rounded-full">⏰ {enabledCount} active jobs</span>
        {errorCount > 0 && (
          <span className="text-xs bg-red-900/40 text-red-300 px-3 py-1 rounded-full">⚠️ {errorCount} with errors</span>
        )}
      </div>

      {/* Job list */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-gray-500 text-sm">No cron jobs found. Sync from heartbeat to populate.</p>}
        {filtered.map(job => {
          const isExpanded = expandedJob === job.id;
          const chId = channelName(job.sessionKey);
          return (
            <div key={job.id} className={`bg-gray-800 rounded-lg border-l-4 ${
              !job.enabled ? 'border-gray-700 opacity-60' :
              job.state?.lastStatus === 'error' ? 'border-red-500' :
              job.state?.lastStatus === 'ok' ? 'border-green-500' : 'border-purple-500'
            } transition`}>
              <div className="p-3 cursor-pointer" onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {job.enabled ? '⏰' : '⏸️'} {job.name || job.id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 font-mono">{formatSchedule(job.schedule)}</div>
                    <div className="flex gap-2 mt-1 flex-wrap items-center">
                      {job.state?.lastStatus && (
                        <span className={`text-[10px] ${STATUS_COLORS[job.state.lastStatus] || 'text-gray-400'}`}>
                          {job.state.lastStatus === 'ok' ? '✅' : '❌'} {job.state.lastStatus}
                        </span>
                      )}
                      {chId && <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded">📢 {chId}</span>}
                      {job.sessionTarget && <span className="text-[10px] text-gray-500">{job.sessionTarget}</span>}
                    </div>
                  </div>
                  <span className="text-gray-500 text-xs ml-2">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-700 pt-3">
                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">ID:</span>
                      <span className="ml-1 text-gray-300 font-mono text-[10px]">{job.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Agent:</span>
                      <span className="ml-1 text-gray-300">{job.agentId || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Session Target:</span>
                      <span className="ml-1 text-gray-300">{job.sessionTarget || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Wake Mode:</span>
                      <span className="ml-1 text-gray-300">{job.wakeMode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-1 text-gray-300">{formatDate(job.createdAtMs)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Updated:</span>
                      <span className="ml-1 text-gray-300">{formatDate(job.updatedAtMs)}</span>
                    </div>
                  </div>

                  {/* Creator / Session */}
                  {job.sessionKey && (
                    <div className="text-xs">
                      <span className="text-gray-500">Creator Session:</span>
                      <span className="ml-1 text-gray-300 font-mono text-[10px]">{job.sessionKey}</span>
                    </div>
                  )}

                  {/* Schedule */}
                  <div className="bg-gray-900 rounded p-2">
                    <div className="text-[10px] text-gray-500 font-semibold mb-1">Schedule</div>
                    <div className="text-xs text-gray-300 font-mono">{formatSchedule(job.schedule)}</div>
                    {job.state?.nextRunAtMs && (
                      <div className="text-[10px] text-gray-400 mt-1">Next run: {formatDate(job.state.nextRunAtMs)}</div>
                    )}
                  </div>

                  {/* Payload */}
                  {job.payload && (
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-[10px] text-gray-500 font-semibold mb-1">
                        Payload ({job.payload.kind})
                        {job.payload.timeoutSeconds && <span className="text-gray-600 ml-1">timeout: {job.payload.timeoutSeconds}s</span>}
                      </div>
                      {job.payload.message && (
                        <pre className="text-[10px] text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{job.payload.message}</pre>
                      )}
                    </div>
                  )}

                  {/* Delivery */}
                  {job.delivery && (
                    <div className="bg-gray-900 rounded p-2">
                      <div className="text-[10px] text-gray-500 font-semibold mb-1">Delivery</div>
                      <div className="text-xs text-gray-300">
                        Mode: {job.delivery.mode}
                        {job.delivery.channel && <span className="ml-2">Channel: {job.delivery.channel}</span>}
                        {job.delivery.to && <span className="ml-2">To: {job.delivery.to}</span>}
                        {job.delivery.bestEffort && <span className="ml-2 text-yellow-400">(best effort)</span>}
                      </div>
                    </div>
                  )}

                  {/* Last Run State */}
                  {job.state && (job.state.lastRunAtMs || job.state.lastStatus) && (
                    <div className={`bg-gray-900 rounded p-2 ${job.state.lastStatus === 'error' ? 'border border-red-900' : ''}`}>
                      <div className="text-[10px] text-gray-500 font-semibold mb-1">Last Run</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className={`ml-1 ${STATUS_COLORS[job.state.lastStatus || ''] || 'text-gray-300'}`}>
                            {job.state.lastStatus || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-1 text-gray-300">{formatDuration(job.state.lastDurationMs)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Run at:</span>
                          <span className="ml-1 text-gray-300">{formatDate(job.state.lastRunAtMs)}</span>
                        </div>
                        {(job.state.consecutiveErrors || 0) > 0 && (
                          <div>
                            <span className="text-gray-500">Consecutive errors:</span>
                            <span className="ml-1 text-red-400">{job.state.consecutiveErrors}</span>
                          </div>
                        )}
                      </div>
                      {job.state.lastError && (
                        <div className="text-[10px] text-red-400 mt-1">⚠️ {job.state.lastError}</div>
                      )}
                    </div>
                  )}

                  {job.deleteAfterRun && (
                    <div className="text-[10px] text-yellow-400">🗑️ Deletes after run (one-shot)</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
