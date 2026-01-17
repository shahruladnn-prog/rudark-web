import type { Metadata } from "next";
import { Inter, Teko, Montserrat, Black_Ops_One } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { AuthProvider } from '@/components/auth-provider';
import { DialogProvider } from '@/components/ui/dialog';
import { ToastProvider } from '@/components/ui/toast';
import LayoutWrapper from '@/components/layout-wrapper';

import { getCategories } from '@/actions/category-actions';
import { getSettings } from '@/actions/settings-actions';

const inter = Inter({ subsets: ["latin"] });

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
  icons: {
    icon: '/Icon White.png',        // White icon for dark browser tabs
    shortcut: '/Icon White.png',
    apple: '/Icon Black.png',       // Black outline for light Apple devices
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
                <LayoutWrapper categories={categories} settings={settings}>
                  {children}
                </LayoutWrapper>
              </CartProvider>
            </ToastProvider>
          </DialogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
