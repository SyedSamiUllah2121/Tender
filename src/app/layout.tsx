import type {Metadata} from 'next';
import {JetBrains_Mono, Plus_Jakarta_Sans} from 'next/font/google';
import React from 'react';
import {AppShell} from './app-shell';
import './globals.css';
import {Providers} from './providers';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const DESCRIPTION =
  'Tender and project management system for Inspire Builders General Contracting in Abu Dhabi and Dubai, UAE.';

export const metadata: Metadata = {
  title: {
    default: 'Inspire Tender & Project Management System',
    template: '%s · Inspire Builders',
  },
  description: DESCRIPTION,
  openGraph: {
    title: 'Inspire Tender & Project Management System',
    description: DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${jetbrainsMono.variable}`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
