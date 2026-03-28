import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'PMCopilot - AI-Powered Product Management',
  description: 'Cursor for Product Managers - Analyze feedback, get insights, build better products',
  keywords: ['product management', 'AI', 'feedback analysis', 'insights', 'PMCopilot'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="pmcopilot-theme-init" strategy="beforeInteractive">
          {`(function(){try{var stored=localStorage.getItem('pmcopilot-theme');var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var useDark=stored?stored==='dark':prefersDark;document.documentElement.classList.toggle('dark',useDark);}catch(e){}})();`}
        </Script>
      </head>
      <body className="antialiased bg-background text-foreground">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
