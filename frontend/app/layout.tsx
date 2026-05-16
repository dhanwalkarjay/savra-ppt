import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Savra PPT Generator',
  description: 'AI-powered presentation generator for Indian school teachers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}