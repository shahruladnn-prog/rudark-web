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
  const [categories, settings] = await Promise.all([
    getCategories(),
    getSettings()
  ]);

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
