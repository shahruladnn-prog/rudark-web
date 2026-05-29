import type { Metadata } from "next";
import { Teko, Montserrat, Black_Ops_One } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { CatalogInquiryProvider } from "@/context/catalog-inquiry-context";
import { AuthProvider } from '@/components/auth-provider';
import { DialogProvider } from '@/components/ui/dialog';
import { ToastProvider } from '@/components/ui/toast';
import LayoutWrapper from '@/components/layout-wrapper';
import AnalyticsProvider from '@/components/analytics-provider';
import { Analytics } from '@vercel/analytics/react';

import { getCategories } from '@/actions/category-actions';
import { getSettings } from '@/actions/settings-actions';

const teko = Teko({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-teko"
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat"
});

const blackOpsOne = Black_Ops_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-black-ops"
});

export const metadata: Metadata = {
  title: "Rud'Ark PRO SHOP",
  description: "Premium technical gear for aquatic dominance.",
  metadataBase: new URL('https://rudark-web.vercel.app'),
  icons: {
    icon: '/Icon White.png',
    shortcut: '/Icon White.png',
    apple: '/Icon Black.png',
  },
  openGraph: {
    title: "Rud'Ark PRO SHOP",
    description: "Premium technical gear for aquatic dominance.",
    url: 'https://rudark-web.vercel.app',
    siteName: "Rud'Ark",
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 800,
        alt: "Rud'Ark Logo",
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Rud'Ark PRO SHOP",
    description: "Premium technical gear for aquatic dominance.",
    images: ['/logo.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let categories: any[] = [];
  let settings: any = null;

  try {
    // console.log('[RootLayout] Fetching global data...');
    [categories, settings] = await Promise.all([
      getCategories().catch(e => {
        console.error('[RootLayout] Categories fetch failed:', e);
        return [];
      }),
      getSettings().catch(e => {
        console.error('[RootLayout] Settings fetch failed:', e);
        return null;
      })
    ]);
  } catch (error) {
    console.error('[RootLayout] CRITICAL DATA FAILURE:', error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${teko.variable} ${blackOpsOne.variable} font-sans bg-[#121212] text-gray-100`} suppressHydrationWarning>
        <AuthProvider>
          <DialogProvider>
            <ToastProvider>
              <CartProvider>
                <CatalogInquiryProvider>
                  <LayoutWrapper categories={categories} settings={settings}>
                    {children}
                  </LayoutWrapper>
                </CatalogInquiryProvider>
                <Analytics />
                <AnalyticsProvider />
              </CartProvider>
            </ToastProvider>
          </DialogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
