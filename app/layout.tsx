import type { Metadata } from 'next';
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
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
