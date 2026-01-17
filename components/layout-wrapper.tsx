'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/navbar';
import FooterRefined from '@/components/footer-refined';
import FloatingSocial from '@/components/floating-social';

interface LayoutWrapperProps {
    children: React.ReactNode;
    categories: any[];
    settings: any;
}

/**
 * Wrapper component that conditionally renders navbar, footer, and floating social
 * based on the current route. Admin pages don't need these elements.
 */
export default function LayoutWrapper({ children, categories, settings }: LayoutWrapperProps) {
    const pathname = usePathname();

    // Hide navbar, footer, social for admin and login pages
    const isAdminRoute = pathname?.startsWith('/admin');
    const isLoginRoute = pathname === '/login';
    const hideChrome = isAdminRoute || isLoginRoute;

    return (
        <>
            {!hideChrome && <Navbar categories={categories} settings={settings} />}
            {children}
            {!hideChrome && <FooterRefined categories={categories} />}
            {!hideChrome && <FloatingSocial />}
        </>
    );
}
