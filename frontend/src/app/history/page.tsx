'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  History as HistoryIcon,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Clipboard,
  FileCheck,
  Globe,
  RefreshCw
} from 'lucide-react';
import { HistoryItem, HistoryStats } from '@/lib/types';
import { getHistory, deleteHistoryItem, clearAllHistory, getHistoryStats } from '@/lib/api';

export default function HistoryPage() {
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrediction, setFilterPrediction] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [items, statData] = await Promise.all([
        getHistory(50, 0, searchQuery || undefined, filterPrediction),
        getHistoryStats()
      ]);
      setHistoryItems(items);
      setStats(statData);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterPrediction]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this analysis record?')) return;
    try {
      await deleteHistoryItem(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Warning: This will permanently delete all analysis records from your history. Continue?')) return;
    setIsDeleting(true);
    try {
      await clearAllHistory();
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getInputIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />;
      case 'clipboard':
        return <Clipboard className="h-3.5 w-3.5 text-indigo-400" />;
      case 'pdf':
        return <FileCheck className="h-3.5 w-3.5 text-emerald-400" />;
      case 'url':
        return <Globe className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <HistoryIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs uppercase tracking-widest font-bold text-cyan-600 dark:text-cyan-400">
              Recent Activity
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
            Recent News Verifications
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Review past checks, inspect credibility verdicts, and re-read publisher evidence.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          {historyItems.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isDeleting}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-5 text-center shadow-sm">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total_analyzed}</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Total Analyses
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-5 text-center shadow-sm">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.likely_real_count}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Likely Real (Verified)
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-5 text-center shadow-sm">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {stats.potentially_fake_count}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Potentially Fake (Flagged)
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-5 text-center shadow-sm">
            <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
              {stats.average_credibility}/100
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
              Average Credibility
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3 backdrop-blur-md shadow-sm">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, headline, or keywords..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 pl-9 pr-4 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </form>

        {/* Prediction Filter */}
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {['ALL', 'Likely Real', 'Potentially Fake'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterPrediction(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterPrediction === f
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-sm drop-shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All Records' : f}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading analysis records...</p>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 p-12 text-center space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto">
            <HistoryIcon className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Analysis Records Found</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'No records matched your search query. Try clearing filters.'
              : 'You have not analyzed any news articles yet. Get started with the Multimodal Analyzer!'}
          </p>
          <div>
            <Link
              href="/analyze"
              style={{ color: '#ffffff' }}
              className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2 text-xs font-bold !text-white hover:from-cyan-400 hover:to-indigo-500 transition shadow-md drop-shadow-sm"
            >
              <span style={{ color: '#ffffff' }} className="!text-white font-bold">Analyze First Article</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => {
            const isReal = item.prediction === 'Likely Real';
            return (
              <div
                key={item.id}
                onClick={() => router.push(`/results?id=${item.id}`)}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-900/80 transition-all cursor-pointer group space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Left: Input Type & Title */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {getInputIcon(item.input_type)}
                      <span className="capitalize">{item.input_type}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate max-w-md">
                      {item.title}
                    </h3>
                  </div>

                  {/* Right: Prediction & Score */}
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isReal
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {item.prediction} ({item.confidence}%)
                    </span>

                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                      Score: {item.credibility_score}/100
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 transition rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Delete record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Snippet */}
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {item.snippet}
                </p>

                {/* Footer timestamp & details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <div>
                    {new Date(item.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </div>

                  <div className="flex items-center space-x-1 text-cyan-600 dark:text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>View Full Report</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
