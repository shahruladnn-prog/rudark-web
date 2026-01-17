'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Tag, Settings, LogOut, ExternalLink, FolderTree, BarChart3, CreditCard, Truck, Warehouse, MapPin, ShoppingCart, Building2, Menu, X, Monitor, Users, ScanLine } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

// Define which items show on mobile
const NAV_ITEMS = [
    { icon: BarChart3, label: 'Dashboard', href: '/admin', exact: true, mobile: true },
    { icon: ScanLine, label: 'Scan Orders', href: '/admin/orders/ship-scan', mobile: true, highlight: true },
    { icon: ShoppingCart, label: 'Orders', href: '/admin/orders', mobile: true },
    { icon: Warehouse, label: 'Stock', href: '/admin/stock', mobile: true },
    { icon: Package, label: 'Products', href: '/admin/products', mobile: false },
    { icon: FolderTree, label: 'Categories', href: '/admin/categories', mobile: false },
    { icon: Users, label: 'Consignments', href: '/admin/consignments', mobile: true },
    { icon: Building2, label: 'Stores', href: '/admin/stores', mobile: false },
    { icon: Tag, label: 'Promos', href: '/admin/promos', mobile: false },
    { icon: Truck, label: 'Shipping', href: '/admin/shipping-settings', mobile: false },
    { icon: MapPin, label: 'Collection Points', href: '/admin/collection-settings', mobile: false },
    { icon: CreditCard, label: 'Payment', href: '/admin/payment-settings', mobile: false },
    { icon: Settings, label: 'Settings', href: '/admin/settings', mobile: false },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close sidebar on navigation
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        try {
            const auth = getAuth(app);
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error("Logout Error:", error);
            alert("Failed to logout.");
        }
    };

    const visibleItems = isMobile ? NAV_ITEMS.filter(item => item.mobile) : NAV_ITEMS;
    const hiddenItems = isMobile ? NAV_ITEMS.filter(item => !item.mobile) : [];

    return (
        <>
            {/* Mobile Header Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-rudark-carbon border-b border-rudark-grey z-50 flex items-center justify-between px-4">
                <span className="text-lg font-condensed font-bold text-white uppercase">
                    Rud'Ark <span className="text-rudark-volt">Admin</span>
                </span>
                <div className="flex items-center gap-2">
                    {/* Quick Scan Button */}
                    <Link
                        href="/admin/orders/ship-scan"
                        className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                    >
                        <ScanLine size={22} />
                    </Link>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="p-2 text-gray-400 hover:text-white"
                    >
                        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                ${isMobile
                    ? `fixed top-14 left-0 h-[calc(100vh-56px)] z-50 transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
                    : 'fixed left-0 top-0 h-screen'
                }
                w-64 bg-rudark-carbon border-r border-rudark-grey flex flex-col
            `}>
                {/* Brand Header - Desktop only */}
                {!isMobile && (
                    <div className="h-20 flex items-center px-6 border-b border-rudark-grey">
                        <span className="text-2xl font-condensed font-bold text-white uppercase tracking-wider">
                            Rud'Ark <span className="text-rudark-volt">Admin</span>
                        </span>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto">
                    {/* Mobile Section Label */}
                    {isMobile && (
                        <div className="px-4 py-2 text-xs text-gray-500 uppercase font-mono">
                            Quick Access
                        </div>
                    )}

                    {visibleItems.map((item) => {
                        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                        const Icon = item.icon;
                        const isHighlight = (item as any).highlight;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-all group ${isActive
                                    ? 'bg-rudark-volt text-black font-bold shadow-[0_0_15px_rgba(212,242,34,0.3)]'
                                    : isHighlight
                                        ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-600/30'
                                        : 'text-gray-400 hover:bg-rudark-matte hover:text-white'
                                    }`}
                            >
                                <Icon size={20} className={isActive ? 'text-black' : isHighlight ? 'text-green-400' : 'group-hover:text-rudark-volt'} />
                                <span className={`font-condensed uppercase tracking-wide ${isMobile ? 'text-base' : 'text-lg'} ${isActive ? 'font-bold' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Desktop Only Section */}
                    {isMobile && hiddenItems.length > 0 && (
                        <>
                            <div className="my-4 border-t border-rudark-grey" />
                            <div className="px-4 py-2 text-xs text-gray-500 uppercase font-mono flex items-center gap-2">
                                <Monitor size={12} />
                                Desktop Only
                            </div>
                            <div className="px-4 py-3 bg-rudark-matte/50 rounded-sm">
                                <div className="text-xs text-gray-500 mb-2">
                                    These features require a larger screen:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {hiddenItems.map(item => (
                                        <span key={item.href} className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">
                                            {item.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-rudark-grey space-y-2">
                    <Link href="/" target="_blank" className="flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors">
                        <ExternalLink size={18} />
                        <span className="font-condensed uppercase tracking-wide text-sm">View Live Site</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-sm transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="font-condensed uppercase tracking-wide text-sm">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
