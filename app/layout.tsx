import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'GlazeCorp',
  description: 'Donut Miner Protocol',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`
          ${inter.variable}
          ${jetbrainsMono.variable}
          font-sans
          bg-[#131313]
          text-zinc-300
          antialiased
        `}
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="px-3 lg:px-4 relative z-10 pb-20 md:pb-3 pt-14 flex-1 min-h-[calc(100vh+100px)]">
              {children}
            </main>
            <div className="hidden md:block">
              <Footer />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
