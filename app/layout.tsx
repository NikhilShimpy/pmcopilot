import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/ui/Toast';
import { getPublicAppUrl } from '@/lib/appUrl';

const ICON_URL = '/websiteicon.png?v=1';
const APP_URL = getPublicAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'PMCopilot - AI-Powered Product Management',
  description: 'Cursor for Product Managers - Analyze feedback, get insights, build better products',
  keywords: ['product management', 'AI', 'feedback analysis', 'insights', 'PMCopilot'],
  manifest: '/manifest.json?v=1',
  icons: {
    icon: ICON_URL,
    shortcut: ICON_URL,
    apple: ICON_URL,
  },
  openGraph: {
    title: 'PMCopilot - AI-Powered Product Management',
    description: 'Cursor for Product Managers - Analyze feedback, get insights, build better products',
    images: [
      {
        url: ICON_URL,
        width: 512,
        height: 512,
        alt: 'PMCopilot Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'PMCopilot - AI-Powered Product Management',
    description: 'Cursor for Product Managers - Analyze feedback, get insights, build better products',
    images: [ICON_URL],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="icon" href={ICON_URL} />
          <link rel="shortcut icon" href={ICON_URL} />
          <link rel="apple-touch-icon" href={ICON_URL} />
          <script
            id="pmcopilot-theme-init"
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{var stored=localStorage.getItem('pmcopilot-theme');var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var useDark=stored?stored==='dark':prefersDark;document.documentElement.classList.toggle('dark',useDark);}catch(e){}})();",
            }}
          />
        </head>
      <body className="antialiased bg-background text-foreground">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
