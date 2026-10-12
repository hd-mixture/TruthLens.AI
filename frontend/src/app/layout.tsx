import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'TruthLens AI — Real-Time News Verification & Fact Engine',
  description: 'Instant news credibility evaluation and live web fact-checking. Verify breaking headlines, social rumors, and screenshot images against authoritative global sources.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  keywords: [
    'News Verification',
    'Fact Checking',
    'TruthLens AI',
    'Real-Time News',
    'Disinformation Defense',
    'Journalistic Credibility'
  ],
  authors: [{ name: 'TruthLens AI Team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('truthlens-theme');
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && systemDark) || (stored === 'system' && systemDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
        <Navbar />
        <main className="flex-1 w-full relative">
          {/* Subtle Global Background Gradients */}
          <div className="fixed inset-0 pointer-events-none bg-grid-pattern opacity-40 z-0" />
          <div className="relative z-10 w-full">
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
