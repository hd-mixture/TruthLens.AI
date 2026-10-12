'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import logoImg from '@/Logos/TruthLens.AI_Logo.png';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/60 bg-slate-100/70 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-sm transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <Image
                src={logoImg}
                alt="TruthLens.AI Logo"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                TruthLens<span className="text-cyan-600 dark:text-cyan-400">.AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
              Real-time AI truth and news verification engine. Analyzes claims across viral text, screenshots, and social posts — corroborating every fact against verified global news sources.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl max-w-md shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>Independent evidence corroboration powered by live web news search.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Features</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/analyze" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Verify Text &amp; Articles</Link>
              </li>
              <li>
                <Link href="/analyze" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Screenshot &amp; OCR Check</Link>
              </li>
              <li>
                <Link href="/analyze" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">URL &amp; Web Article Scan</Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Verification History</Link>
              </li>
            </ul>
          </div>

          {/* Standards & Transparency */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Verification Standards</h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Multi-Source Corroboration</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                <span>Primary News Attribution</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>Fact-Check Cross Validation</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span>Unbiased Neutral Analysis</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-200/80 dark:border-slate-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div>
            &copy; 2026 TruthLens AI &bull; Intelligent News Verification
          </div>
          <div className="mt-2 sm:mt-0 flex items-center space-x-4">
            <span>Analyze with confidence. Never fall for fake news.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
