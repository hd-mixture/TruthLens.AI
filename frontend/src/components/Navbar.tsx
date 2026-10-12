'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { History, Sparkles, Sun, Moon, Laptop } from 'lucide-react';
import logoImg from '@/Logos/TruthLens.AI_Logo.png';

type ThemeMode = 'system' | 'dark' | 'light';

export default function Navbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from storage or system on client mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('truthlens-theme') as ThemeMode | null;
    const initialTheme: ThemeMode = saved && ['system', 'dark', 'light'].includes(saved) ? saved : 'system';
    setTheme(initialTheme);
    applyTheme(initialTheme);

    // Listen to OS system color-scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const current = localStorage.getItem('truthlens-theme');
      if (!current || current === 'system') {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (mode === 'dark' || (mode === 'system' && isSystemDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const cycleTheme = () => {
    let next: ThemeMode = 'system';
    if (theme === 'system') next = 'dark';
    else if (theme === 'dark') next = 'light';
    else if (theme === 'light') next = 'system';

    setTheme(next);
    localStorage.setItem('truthlens-theme', next);
    applyTheme(next);
  };

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/analyze', label: 'Verify News', icon: Sparkles },
    { href: '/history', label: 'Recent Checks', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors duration-200">
      {/* Full width container spanning edge to edge */}
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-8 lg:px-12">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center space-x-3 transition">
          <Image
            src={logoImg}
            alt="TruthLens.AI Logo"
            width={42}
            height={42}
            className="h-10 w-10 object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-md"
            priority
          />
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              TruthLens<span className="text-cyan-600 dark:text-cyan-400">.AI</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-medium">
              Real-Time News Verification
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Theme Switcher & CTA Button */}
        <div className="flex items-center space-x-3">
          {/* Theme Mode Toggle */}
          {mounted && (
            <button
              type="button"
              onClick={cycleTheme}
              title={`Theme: ${theme === 'system' ? 'Auto (System)' : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}`}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-sm"
            >
              {theme === 'system' && (
                <>
                  <Laptop className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span className="hidden sm:inline">Auto</span>
                </>
              )}
              {theme === 'dark' && (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
              {theme === 'light' && (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Light</span>
                </>
              )}
            </button>
          )}

          {/* Verify News CTA */}
          <Link
            href="/analyze"
            style={{ color: '#ffffff' }}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-bold !text-white shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all drop-shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-white shrink-0" />
            <span style={{ color: '#ffffff' }} className="!text-white font-bold">Verify News</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
