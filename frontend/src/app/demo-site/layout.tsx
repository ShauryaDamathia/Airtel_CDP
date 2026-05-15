import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Airtel Store — Demo Site',
  description: 'Airtel customer-facing store simulator for CDP event demonstration'
};

/**
 * Standalone layout for the demo site — completely separate from the
 * internal CDP dashboard. No sidebar, no auth guard, no dashboard chrome.
 */
export default function DemoSiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
