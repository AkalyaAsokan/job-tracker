import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SDE Job Tracker',
  description: 'Daily SDE job openings from top tech companies',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
