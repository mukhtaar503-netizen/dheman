import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { ThemeInit, THEME_BOOT_SCRIPT } from '@/components/theme-init';
import './globals.css';

export const metadata: Metadata = {
  title: 'Service Management System',
  description: 'Installation and maintenance service operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
