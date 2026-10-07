'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { useAuthSession } from '@/hooks/useAuthSession';

interface AppLogRow {
  id: string;
  level: string;
  loggerName: string;
  message: string;
  tracebackText: string | null;
  createdAt: string | null;
}

const LEVELS = ['', 'ERROR', 'WARNING'] as const;

export default function ProductLogsPage() {
  const user = useAuthSession<{ role: string }>();
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('');
  const [logs, setLogs] = useState<AppLogRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get<{ logs: AppLogRow[] }>('/api/product-logs', {
        params: level ? { level } : {},
      });
      setLogs(response.data.logs ?? []);
    } catch {
      setError('Could not load logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    if (user?.role === 'PRODUCT_ADMIN') {
      void load();
    }
  }, [user, load]);

  if (user && user.role !== 'PRODUCT_ADMIN') {
    return <p className="p-6 text-sm text-slate-600">Only the product admin can view application logs.</p>;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Logs</h1>
          <p className="text-sm text-slate-600">Warnings and errors recorded by the application.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600" htmlFor="log-level">
            Level
          </label>
          <select
            id="log-level"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={level}
            onChange={(event) => setLevel(event.target.value as (typeof LEVELS)[number])}
          >
            <option value="">All</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
          </select>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading logs…</p> : null}
      {!loading && logs.length === 0 ? (
        <p className="text-sm text-slate-500">No logs for this filter.</p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Level</th>
              <th className="px-3 py-2 font-medium">Logger</th>
              <th className="px-3 py-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top">
                <td className="whitespace-nowrap px-3 py-2 text-slate-500">{row.createdAt ?? ''}</td>
                <td className="px-3 py-2 font-medium">{row.level}</td>
                <td className="px-3 py-2 text-slate-600">{row.loggerName}</td>
                <td className="px-3 py-2">
                  <p className="whitespace-pre-wrap text-slate-900">{row.message}</p>
                  {row.tracebackText ? (
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-500">
                      {row.tracebackText}
                    </pre>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
