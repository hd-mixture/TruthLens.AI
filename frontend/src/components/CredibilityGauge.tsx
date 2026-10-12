'use client';

import React from 'react';
import { ScoreFactor } from '@/lib/types';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

interface CredibilityGaugeProps {
  score: number;
  riskLevel: string;
  factors: ScoreFactor[];
}

export default function CredibilityGauge({ score, riskLevel, factors }: CredibilityGaugeProps) {
  // Score range 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  // Determine color scheme
  let strokeColor = '#10b981'; // Emerald
  let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let glowClass = 'glow-emerald';

  if (clampedScore < 30) {
    strokeColor = '#f43f5e'; // Rose/Red
    badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    glowClass = 'glow-rose';
  } else if (clampedScore < 50) {
    strokeColor = '#f97316'; // Orange
    badgeBg = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    glowClass = 'text-orange-400';
  } else if (clampedScore < 75) {
    strokeColor = '#eab308'; // Amber/Yellow
    badgeBg = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    glowClass = 'text-yellow-400';
  }

  // SVG Gauge calculations (radius = 58, circumference = 2 * PI * 58 ~= 364.4)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl transition-colors duration-200">
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        {/* Radial Circle Gauge */}
        <div className="relative flex items-center justify-center">
          <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 136 136">
            {/* Background Track */}
            <circle
              cx="68"
              cy="68"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-200 dark:text-slate-800"
              fill="transparent"
            />
            {/* Value Arc */}
            <circle
              cx="68"
              cy="68"
              r={radius}
              stroke={strokeColor}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              fill="transparent"
            />
          </svg>

          {/* Centered Score */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-4xl font-extrabold tracking-tight ${glowClass}`}>
              {clampedScore}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              / 100
            </span>
          </div>
        </div>

        {/* Risk Level Header & Explanation */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-400">
              Credibility &amp; Risk Index
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeBg}`}>
              {riskLevel}
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {clampedScore >= 75
              ? 'High Credibility News Pattern'
              : clampedScore >= 50
              ? 'Moderate Credibility / Caution Advised'
              : clampedScore >= 30
              ? 'High Disinformation Probability'
              : 'Critical Risk: Severe Deception Signals'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Composite evaluation combining TF-IDF statistical machine learning, clickbait headline syntax, viral urgency cues, emotional volatility, institutional attribution, and image OCR confidence.
          </p>
        </div>
      </div>

      {/* Factor Breakdown List */}
      <div className="mt-6 space-y-4">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Scoring Factor Breakdown
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {factors.map((factor, idx) => {
            const factorPercent = Math.round((factor.score / factor.max) * 100);
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/50 p-3.5 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 font-medium text-slate-800 dark:text-slate-200">
                    {factor.status === 'pass' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    )}
                    {factor.status === 'warning' && (
                      <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                    )}
                    {factor.status === 'danger' && (
                      <XCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0" />
                    )}
                    <span>{factor.name}</span>
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {factor.score} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {factor.max} pts</span>
                  </span>
                </div>

                {/* Micro Progress Bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      factor.status === 'pass'
                        ? 'bg-emerald-500 dark:bg-emerald-400'
                        : factor.status === 'warning'
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-rose-500 dark:bg-rose-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, factorPercent))}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                  {factor.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
