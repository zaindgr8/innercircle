import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Inner Circle DXB — Private Founders Event & Cruise',
  description: 'Register for The Inner Circle DXB exclusive 2-Hour Cruise for founders and entrepreneurs. 24 July, 7-9 PM at Al Jaddaf next to Versace Hotel.',
  icons: {
    icon: '/logo.JPG',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
