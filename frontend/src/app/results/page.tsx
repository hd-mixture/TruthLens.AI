'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ArrowLeft,
  FileText,
  Sparkles,
  Search,
  ExternalLink,
  Printer,
  Globe
} from 'lucide-react';
import { AnalysisResult } from '@/lib/types';
import { getHistoryDetail } from '@/lib/api';
import CredibilityGauge from '@/components/CredibilityGauge';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get('id');

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If ID is in query params, fetch from history API
    if (recordId) {
      setIsLoading(true);
      getHistoryDetail(recordId)
        .then((data) => {
          setResult(data);
          setIsLoading(false);
        })
        .catch(() => {
          // Fallback to sessionStorage
          loadFromSession();
        });
    } else {
      loadFromSession();
    }
  }, [recordId]);

  const loadFromSession = () => {
    try {
      const stored = sessionStorage.getItem('truthlens_active_result');
      if (stored) {
        setResult(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!result) return;
    const textToCopy = `TruthLens Verification Report:\nVerdict: ${result.prediction} (${result.confidence}% Confidence)\nCredibility Score: ${result.credibility_score}/100 (${result.risk_level})\nSummary: ${result.ai_explanation.summary}\nKey Claims: ${result.ai_explanation.key_claims.join('; ')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyExtracted = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.input_text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center space-y-4">
        <div className="h-10 w-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading verification report...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto">
          <FileText className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No Active Verification Found</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Please submit a news article, upload an image screenshot, or choose a record from your recent checks.
          </p>
        </div>
        <div>
          <Link
            href="/analyze?reset=true"
            style={{ color: '#ffffff' }}
            className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-2.5 text-xs font-bold !text-white hover:from-cyan-400 hover:to-indigo-500 transition shadow-md drop-shadow-sm"
          >
            <span style={{ color: '#ffffff' }} className="!text-white font-bold">Verify News Now</span>
          </Link>
        </div>
      </div>
    );
  }

  const isReal = result.prediction === 'Likely Real' || result.class_label === 'REAL';
  const isUnverified = result.prediction === 'Unverified / Cannot Determine' || result.class_label === 'UNVERIFIED';
  const isFake = !isReal && !isUnverified;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 transition-colors duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/analyze"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Verification Report &bull; {result.input_type.toUpperCase()}
            </span>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-lg">
              {result.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Share / Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>

          <Link
            href="/analyze?reset=true"
            style={{ color: '#ffffff' }}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-xs font-bold !text-white hover:from-cyan-400 hover:to-indigo-500 transition shadow-sm drop-shadow-sm"
          >
            <span style={{ color: '#ffffff' }} className="!text-white font-bold">Verify Another</span>
          </Link>
        </div>
      </div>

      {/* Hero Prediction & Confidence Banner */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 backdrop-blur-xl transition-all shadow-xl dark:shadow-2xl relative overflow-hidden ${
          isReal
            ? 'border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50/90 dark:from-emerald-950/40 dark:via-slate-900/90 dark:to-slate-950 shadow-emerald-950/10'
            : isUnverified
            ? 'border-amber-300 dark:border-amber-500/40 bg-gradient-to-br from-amber-50/80 via-white to-slate-50/90 dark:from-amber-950/40 dark:via-slate-900/90 dark:to-slate-950 shadow-amber-950/10'
            : 'border-rose-300 dark:border-rose-500/40 bg-gradient-to-br from-rose-50/80 via-white to-slate-50/90 dark:from-rose-950/40 dark:via-slate-900/90 dark:to-slate-950 shadow-rose-950/10'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Prediction Badge & Title */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  isReal
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : isUnverified
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                {isReal ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : isUnverified ? (
                  <Search className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
                {isReal ? 'Verified Real News' : isUnverified ? 'Unverified / Emerging Story' : 'Disinformation / Debunked Rumor'}
              </span>
            </div>

            <div className="flex items-baseline space-x-3">
              <h2
                className={`text-3xl sm:text-5xl font-black tracking-tight ${
                  isReal
                    ? 'text-emerald-600 dark:text-emerald-400 glow-emerald'
                    : isUnverified
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400 glow-rose'
                }`}
              >
                {result.prediction}
              </h2>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 max-w-xl leading-relaxed">
              {isReal
                ? 'External news sources corroborate this report, and factual statements match documented coverage from verified publishers.'
                : isUnverified
                ? 'Current live web search found limited or inconclusive public reporting. Review the sources and claims below.'
                : 'Debunking fact-checks, contradictory evidence, or deceptive viral claims were identified. Exercise caution before believing or sharing.'}
            </p>
          </div>

          {/* Confidence Meter Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 p-5 min-w-[260px] space-y-3 shadow-md">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Analysis Confidence</span>
              <span className={`text-base font-black font-mono ${
                isReal ? 'text-emerald-600 dark:text-emerald-400' : isUnverified ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {result.confidence}%
              </span>
            </div>

            {/* Visual Progress Meter */}
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isReal ? 'bg-emerald-500 dark:bg-emerald-400' : isUnverified ? 'bg-amber-500 dark:bg-amber-400' : 'bg-rose-500 dark:bg-rose-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, result.confidence))}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                Verdict: <strong className="text-slate-900 dark:text-white">{isReal ? 'Corroborated' : isUnverified ? 'Unconfirmed' : 'High Risk'}</strong>
              </div>
              <div className="text-right">
                Credibility: <strong className="text-slate-900 dark:text-white">{result.credibility_score}/100</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Credibility & Risk Gauge */}
      <CredibilityGauge
        score={result.credibility_score}
        riskLevel={result.risk_level}
        factors={result.score_factors}
      />

      {/* Section: Live Global Media Fact-Check & References */}
      {result.evidence_verification && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 space-y-6 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
                  <span>Live News Evidence Corroboration</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Real-time cross-referencing against verified global news outlets and fact-checkers.
                </p>
              </div>
            </div>

            {/* Verification Status Badge */}
            <div className="flex items-center">
              {result.evidence_verification.status === 'SUPPORTED' && (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  <span>Backed by Verified Reporting</span>
                </span>
              )}
              {result.evidence_verification.status === 'CONTRADICTED' && (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <XCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
                  <span>Contradicted by Public Evidence</span>
                </span>
              )}
              {(result.evidence_verification.status === 'INSUFFICIENT_EVIDENCE' || result.evidence_verification.status === 'UNVERIFIED') && (
                <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                  <span>No Corroborating Major Coverage</span>
                </span>
              )}
            </div>
          </div>

          {/* Verification Insight Message Banner */}
          <div
            className={`rounded-xl p-4 text-xs leading-relaxed border ${
              result.evidence_verification.status === 'SUPPORTED'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                : result.evidence_verification.status === 'CONTRADICTED'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200'
            }`}
          >
            <p className="font-medium text-sm leading-relaxed">{result.evidence_verification.message}</p>
          </div>

          {/* Extracted Claim */}
          <div className="bg-slate-50/80 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Primary Claim Checked
            </h4>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              "{result.evidence_verification.extracted_claim}"
            </p>
            {result.evidence_verification.entities && result.evidence_verification.entities.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {result.evidence_verification.entities.map((entity, i) => (
                  <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-[11px] text-cyan-700 dark:text-cyan-300 font-medium">
                    {entity}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Supporting & Contradicting Evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50/80 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-900/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Supporting Corroboration</span>
              </h4>
              {result.evidence_verification.supporting_evidence && result.evidence_verification.supporting_evidence.length > 0 ? (
                <ul className="space-y-2">
                  {result.evidence_verification.supporting_evidence.map((ev, i) => (
                    <li key={i} className="text-xs text-emerald-800 dark:text-emerald-200 flex items-start space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">No credible news outlets confirmed this claim.</p>
              )}
            </div>

            <div className="bg-rose-50/80 dark:bg-rose-950/20 rounded-xl p-4 border border-rose-200 dark:border-rose-900/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3 flex items-center space-x-2">
                <XCircle className="h-4 w-4" />
                <span>Contradicting Findings / Debunking</span>
              </h4>
              {result.evidence_verification.contradicting_evidence && result.evidence_verification.contradicting_evidence.length > 0 ? (
                <ul className="space-y-2">
                  {result.evidence_verification.contradicting_evidence.map((ev, i) => (
                    <li key={i} className="text-xs text-rose-800 dark:text-rose-200 flex items-start space-x-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 italic">No direct contradiction observed in news records.</p>
              )}
            </div>
          </div>

          {/* Publisher Sources Checked */}
          {result.evidence_verification.sources_checked && result.evidence_verification.sources_checked.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Verified Publisher Sources Checked ({result.evidence_verification.sources_checked.length})</span>
                <span className="text-[11px] text-slate-500 font-normal">Click any source to read original reporting</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.evidence_verification.sources_checked.slice(0, 4).map((ref, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/80 p-4 space-y-3 hover:border-cyan-500/40 transition group shadow-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/50 px-2 py-0.5 rounded">
                          {ref.source}
                        </span>
                        {ref.published_at && (
                          <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                            {ref.published_at.split(' ').slice(0, 4).join(' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                        {ref.title}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition"
                      >
                        <span>Open Verified Article</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid: AI Explanation & Warning Signs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: AI Assessment */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 space-y-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                AI Fact-Checking Assessment
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Verified Analysis
            </span>
          </div>

          {/* Executive Summary */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Executive Summary
            </h4>
            <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
              {result.ai_explanation.summary}
            </p>
          </div>

          {/* Nuanced Explanation */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Factual &amp; Contextual Breakdown
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {result.ai_explanation.explanation}
            </p>
          </div>

          {/* Extracted Key Claims */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Key Factual Assertions Identified
            </h4>
            <div className="space-y-2">
              {result.ai_explanation.key_claims.map((claim, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50 p-3 text-xs text-slate-800 dark:text-slate-200"
                >
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">{idx + 1}.</span>
                  <span>{claim}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Verification Suggestions */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center space-x-1.5">
              <Search className="h-3.5 w-3.5" />
              <span>Recommended Next Steps Before Believing / Sharing</span>
            </h4>
            <ul className="space-y-2">
              {result.ai_explanation.verification_suggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  className="flex items-start space-x-2 text-xs text-slate-600 dark:text-slate-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right 1 Col: Warning Flags & Positive Indicators */}
        <div className="space-y-6">
          {/* Warning Signs */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 space-y-4 backdrop-blur-xl shadow-xl">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Warning Flags Detected ({result.warning_signs.length})
              </h4>
            </div>

            {result.warning_signs.length > 0 ? (
              <ul className="space-y-2.5">
                {result.warning_signs.map((sign, idx) => (
                  <li
                    key={idx}
                    className="flex items-start space-x-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 p-2.5 rounded-xl"
                  >
                    <XCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span>{sign}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>No overt red flags or deceptive claims observed.</span>
              </div>
            )}
          </div>

          {/* Positive Indicators */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 space-y-4 backdrop-blur-xl shadow-xl">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Credibility Indicators ({result.positive_indicators.length})
              </h4>
            </div>

            {result.positive_indicators.length > 0 ? (
              <ul className="space-y-2">
                {result.positive_indicators.map((ind, idx) => (
                  <li
                    key={idx}
                    className="flex items-start space-x-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-2.5 rounded-xl"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{ind}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Limited corroborating indicators observed in public sources.
              </p>
            )}
          </div>

          {/* Clean Verification Overview Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 space-y-3 backdrop-blur-xl text-xs shadow-xl">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
              <span>Report Summary</span>
              <span className="text-cyan-600 dark:text-cyan-400">{result.input_type}</span>
            </h4>
            <div className="space-y-2 text-slate-600 dark:text-slate-400 pt-1">
              <div className="flex items-center justify-between">
                <span>Verification Verdict:</span>
                <strong className={isReal ? 'text-emerald-600 dark:text-emerald-400' : isUnverified ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                  {result.prediction}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Confidence Rating:</span>
                <strong className="text-slate-900 dark:text-white">{result.confidence}%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Credibility Index:</span>
                <strong className="text-slate-900 dark:text-white">{result.credibility_score} / 100</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Sources Consulted:</span>
                <strong className="text-slate-900 dark:text-white">
                  {result.evidence_verification?.sources_checked?.length || 0} Outlets
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extracted / Input Content Preview */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 space-y-4 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {result.ocr_details ? 'Extracted Text from Screenshot' : 'Analyzed News Content'}
            </h3>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {result.ocr_details?.confidence !== undefined && (
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                  result.ocr_details.confidence >= 50
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                Text Recognition: {result.ocr_details.confidence}% Accuracy
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyExtracted}
              className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition"
            >
              {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            readOnly
            value={result.input_text}
            rows={5}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-xs text-slate-800 dark:text-slate-300 focus:outline-none resize-y leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-24 text-center space-y-4">
          <div className="h-10 w-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading analysis results...</p>
        </div>
      }
    >
      <ResultsContent />
    </React.Suspense>
  );
}
