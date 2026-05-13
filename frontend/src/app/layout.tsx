import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CDP Platform',
  description: 'Customer Data Platform — Internal Dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
