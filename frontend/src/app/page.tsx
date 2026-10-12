'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import logoImg from '@/Logos/TruthLens.AI_Logo.png';
import {
  ShieldCheck,
  Sparkles,
  Search,
  Globe,
  Clipboard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { analyzeText } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [quickInput, setQuickInput] = useState('');
  const [isQuickAnalyzing, setIsQuickAnalyzing] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const sampleHeadlines = [
    {
      label: 'Viral Health Hoax',
      badge: 'Debunked Claim',
      type: 'fake',
      text: 'SHOCKING: Drinking boiled lemon juice with baking soda completely eliminates all cancer cells overnight, but doctors are desperately hiding the secret cure! SHARE BEFORE IT IS DELETED!'
    },
    {
      label: 'Verified Economic News',
      badge: 'Verified News',
      type: 'real',
      text: 'The Federal Reserve announced an interest rate adjustment following its two-day Federal Open Market Committee meeting, citing stabilizing inflation figures across regional banking sectors.'
    },
    {
      label: 'Breaking Viral Rumor',
      badge: 'Unverified Viral Post',
      type: 'fake',
      text: 'BOMBSHELL EVIDENCE: Top election officials caught on hidden camera burning five million verified ballots in secret underground furnace! Deep state panicking, forward to everyone!'
    },
    {
      label: 'Medical Research Report',
      badge: 'Verified Study',
      type: 'real',
      text: 'Researchers at Oxford University published peer-reviewed findings in The Lancet demonstrating improved efficacy of a novel malaria immunization candidate tested across thirty international medical centers.'
    }
  ];

  // Ensure quick analyze loading state is never stuck on mount, unmount, or back navigation
  useEffect(() => {
    setIsQuickAnalyzing(false);

    const handleBackNavigation = () => {
      setIsQuickAnalyzing(false);
    };

    window.addEventListener('pageshow', handleBackNavigation);
    window.addEventListener('popstate', handleBackNavigation);

    return () => {
      setIsQuickAnalyzing(false);
      window.removeEventListener('pageshow', handleBackNavigation);
      window.removeEventListener('popstate', handleBackNavigation);
    };
  }, []);

  const handleQuickAnalyze = async (textToTest?: string) => {
    const text = textToTest || quickInput;
    if (!text || text.trim().length < 15) {
      setQuickError('Please enter at least 15 characters of news content to verify.');
      return;
    }

    setQuickError(null);
    setIsQuickAnalyzing(true);

    try {
      const result = await analyzeText(text, 'Quick News Verification');
      sessionStorage.setItem('truthlens_active_result', JSON.stringify(result));
      setIsQuickAnalyzing(false);
      router.push(`/results?id=${result.id}`);
    } catch (err: any) {
      setQuickError(err.message || 'Verification failed. Please check your internet connection.');
      setIsQuickAnalyzing(false);
    } finally {
      setIsQuickAnalyzing(false);
    }
  };

  return (
    <div className="space-y-24 pb-24 transition-colors duration-200">
      {/* Hero Section */}
      <section className="relative pt-12 pb-6 sm:pt-20 sm:pb-12 text-center overflow-hidden">
        {/* Radiant glow behind hero */}
        <div className="hero-glow" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Pill Badge */}
          <div className="inline-flex items-center space-x-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300 shadow-sm backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            <span>Live News Intelligence &bull; Real-Time Web Fact Checking</span>
          </div>

          {/* Hero Title */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Know What Is Real. <br />
              <span className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-emerald-600 dark:from-cyan-400 dark:via-indigo-300 dark:to-emerald-400 bg-clip-text text-transparent glow-cyan">
                Before You Share.
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              Verify breaking headlines, viral WhatsApp forwards, screenshots, and social rumors against reliable global news sources in real time.
            </p>
          </div>

          {/* Quick Verification Search Box */}
          <div className="mx-auto max-w-3xl pt-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 p-5 sm:p-6 backdrop-blur-2xl shadow-xl dark:shadow-2xl space-y-4 text-left transition hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-500 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Instant Claim &amp; Headline Check
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Press Ctrl+V to paste screenshot anywhere
                </span>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="Paste a suspicious headline, viral rumor, or news excerpt to check its authenticity..."
                  className="w-full h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 p-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none transition"
                />
              </div>

              {quickError && (
                <div className="text-xs text-rose-500 flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{quickError}</span>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                  <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Cross-checks Reuters, BBC, AP, NDTV &amp; global news wires</span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  {quickInput && !isQuickAnalyzing && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickInput('');
                        setQuickError(null);
                      }}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleQuickAnalyze()}
                    disabled={isQuickAnalyzing}
                    style={{ color: '#ffffff' }}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-2.5 text-xs font-bold !text-white hover:from-cyan-400 hover:to-indigo-500 shadow-md shadow-cyan-500/25 transition-all disabled:opacity-50 drop-shadow-sm"
                  >
                    {isQuickAnalyzing ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span style={{ color: '#ffffff' }} className="!text-white">Searching Live News Sources...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-white shrink-0" />
                        <span style={{ color: '#ffffff' }} className="!text-white font-bold">Verify Claim Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Sample Presets */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                    Try sample checks:
                  </span>
                  <Link
                    href="/analyze"
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-medium inline-flex items-center space-x-1"
                  >
                    <span>Full Multimodal Studio</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleHeadlines.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuickInput(sample.text);
                        handleQuickAnalyze(sample.text);
                      }}
                      className={`text-left p-2.5 rounded-xl border transition flex flex-col justify-between group ${
                        sample.type === 'fake'
                          ? 'border-rose-500/20 bg-rose-50/70 dark:bg-rose-500/5 hover:border-rose-500/40 hover:bg-rose-100/50 dark:hover:bg-rose-500/10'
                          : 'border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className={`font-semibold ${sample.type === 'fake' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {sample.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                          {sample.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        "{sample.text}"
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Highlights Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 p-6 space-y-3 backdrop-blur-xl shadow-sm hover:border-cyan-500/40 transition">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Live News Corroboration</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every query triggers real-time searches across trusted global news organizations to confirm whether reliable journalists have reported the event.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 p-6 space-y-3 backdrop-blur-xl shadow-sm hover:border-indigo-500/40 transition">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Clipboard className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Direct Screenshot &amp; Paste (Ctrl+V)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Snip any WhatsApp forward, tweet, or social media graphic and hit Ctrl+V. Text is read seamlessly without saving files.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 p-6 space-y-3 backdrop-blur-xl shadow-sm hover:border-emerald-500/40 transition">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unbiased Evidence &amp; Sources</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Receive a clear credibility verdict accompanied by clickable citations from established newsrooms so you can verify the facts yourself.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works (Consumer 3-Step Guide) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            Simple 3-Step Verification
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How TruthLens Verifies the News
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
            You don't need to be a fact-checking specialist. TruthLens automates cross-referencing in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 space-y-4 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">01</span>
              <FileText className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Submit News or Image</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Type a headline, paste an article URL, upload a PDF report, or simply paste an image screenshot directly with Ctrl+V.
            </p>
          </div>

          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 space-y-4 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">02</span>
              <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Live Search &amp; Cross-Reference</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              TruthLens queries real-time global news publications, official statements, and credible reports to verify whether the claims have occurred.
            </p>
          </div>

          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-6 space-y-4 backdrop-blur-xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">03</span>
              <CheckCircle2 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Get Verdict &amp; Direct Citations</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Read an executive summary, view red flags or supporting evidence, and browse direct links to original verified reporting.
            </p>
          </div>
        </div>
      </section>

      {/* Multimodal Features Showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-900/90 dark:via-slate-950 dark:to-slate-900 p-8 sm:p-12 backdrop-blur-2xl shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                Any Format. Any Source.
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Inspect Claims Across All Media Types
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Misinformation does not just exist as plain text. It circulates as screenshot memes on Instagram, forwards on WhatsApp groups, edited documents, and viral links. TruthLens supports all of them.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Articles &amp; Headlines</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Screenshots (Ctrl+V)</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>Web Article URLs</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>PDF Press Releases</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-800 dark:text-slate-300">What TruthLens Analyzes</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Automatic</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-start space-x-3 text-slate-700 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                  <span><strong>Claim Authenticity:</strong> Checks if the headline describes an actual confirmed event or a fabrication.</span>
                </div>
                <div className="flex items-start space-x-3 text-slate-700 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <span><strong>Sensationalist Language:</strong> Identifies panic-inducing, clickbait, and emotionally manipulative framing.</span>
                </div>
                <div className="flex items-start space-x-3 text-slate-700 dark:text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span><strong>Authoritative Publisher Citations:</strong> Supplies links to established newsrooms reporting on the subject.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-50/80 via-white to-slate-50 dark:from-cyan-950/30 dark:via-slate-900/60 dark:to-slate-950 p-8 sm:p-12 space-y-6 shadow-xl backdrop-blur-xl">
          <div className="mx-auto flex justify-center">
            <Image
              src={logoImg}
              alt="TruthLens.AI Logo"
              width={72}
              height={72}
              className="h-18 w-18 object-contain drop-shadow-[0_0_24px_rgba(56,189,248,0.35)]"
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Ready to verify a news story?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Never share unverified rumors. Use TruthLens to ensure the information you pass on is backed by facts.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/analyze"
              style={{ color: '#ffffff' }}
              className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3.5 text-xs font-bold !text-white hover:from-cyan-400 hover:to-indigo-500 transition-all shadow-lg shadow-cyan-500/25 hover:scale-105 drop-shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-white shrink-0" />
              <span style={{ color: '#ffffff' }} className="!text-white font-bold">Launch Verifier Studio</span>
              <ArrowRight className="h-4 w-4 text-white ml-1 shrink-0" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
