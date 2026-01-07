import type { Metadata } from "next";
import { Inter, Teko, Montserrat } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { AuthProvider } from '@/components/auth-provider';
import Navbar from "@/components/navbar";
import FooterRefined from "@/components/footer-refined";
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

export const metadata: Metadata = {
  title: "Rud'Ark PRO SHOP",
  description: "Premium technical gear for aquatic dominance.",
};



export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let categories: any[] = [];
  let settings: any = null;

  try {
    console.log('[RootLayout] Fetching global data...');
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
    console.log('[RootLayout] Data fetched successfully.');
  } catch (error) {
    console.error('[RootLayout] CRITICAL DATA FAILURE:', error);
  }

  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${teko.variable} font-sans bg-[#121212] text-gray-100`}>
        <AuthProvider>
          <CartProvider>
            <Navbar categories={categories} settings={settings} />
            {children}
            <FooterRefined />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
