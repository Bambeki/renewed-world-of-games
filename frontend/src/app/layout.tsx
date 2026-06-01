import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Renewed World of Games',
  description: 'Multiplayer football management platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
