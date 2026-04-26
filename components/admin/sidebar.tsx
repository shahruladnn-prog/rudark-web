'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, ShoppingCart, RotateCcw, ScanLine, Truck, RefreshCcw,
    Warehouse, ArrowDownToLine, Sliders, AlertTriangle, ArrowLeftRight, ClipboardList, ShoppingBag,
    Package, FolderTree, Tag, Users, MessageSquare,
    Building2, Truck as TruckIcon, MapPin, CreditCard, Settings,
    BarChart3, Activity, ExternalLink, LogOut, Menu, X, ChevronRight,
    Receipt, Shield, FileText
    } from 'lucide-react';

import { getAuth, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useAdminRole } from './admin-role-context';
import { clearSession } from '@/actions/session-actions';

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', exact: true },
        ]
    },
    {
        label: 'Orders',
        items: [
            { icon: ShoppingCart, label: 'All Orders', href: '/admin/orders' },
            { icon: ScanLine, label: 'Ship Scan', href: '/admin/orders/ship-scan' },
            { icon: Truck, label: 'Delivery Check', href: '/admin/orders/delivery-check' },
            { icon: RotateCcw, label: 'Returns', href: '/admin/orders/returns' },
        ]
    },
    {
        label: 'Inventory',
        items: [
            { icon: Warehouse, label: 'Stock', href: '/admin/stock' },
            { icon: ArrowDownToLine, label: 'Receive', href: '/admin/stock/receive' },
            { icon: Sliders, label: 'Adjust', href: '/admin/stock/adjust' },
            { icon: AlertTriangle, label: 'Damage', href: '/admin/stock/damage' },
            {icon: ArrowLeftRight, label: 'Transfer', href: '/admin/stock/transfer' },
            {icon: ClipboardList, label: 'Audit', href: '/admin/stock/audit' },
            { icon: ShoppingBag, label: 'Manual POS', href: '/admin/pos' },
            ]
            },

    {
        label: 'Catalogue',
        items: [
            { icon: Package, label: 'Products', href: '/admin/products' },
            { icon: FolderTree, label: 'Categories', href: '/admin/categories' },
            { icon: Tag, label: 'Promos', href: '/admin/promos' },
            { icon: Users, label: 'Consignments', href: '/admin/consignments' },
            { icon: MessageSquare, label: 'Reviews', href: '/admin/products/reviews' },
        ]
    },
    {
        label: 'Reports',
        items: [
            { icon: BarChart3, label: 'Sales Reports', href: '/admin/reports' },
            { icon: Activity, label: 'Stock Movements', href: '/admin/reports/stock-movements' },
            { icon: RotateCcw, label: 'Refunds', href: '/admin/reports/refunds' },
            { icon: Tag, label: 'Promo Codes', href: '/admin/reports/promos' },
            { icon: Receipt, label: 'SST Report', href: '/admin/reports/sst' },
        ]
    },
    {
        label: 'Content',
        items: [
            { icon: FileText, label: 'Blog', href: '/admin/blog' },
        ]
    },
    {
        label: 'Settings',
        items: [
            { icon: Building2, label: 'Stores', href: '/admin/stores' },
            { icon: TruckIcon, label: 'Shipping', href: '/admin/shipping-settings' },
            { icon: MapPin, label: 'Collection Points', href: '/admin/collection-settings' },
            { icon: CreditCard, label: 'Payment', href: '/admin/payment-settings' },
            { icon: Settings, label: 'General', href: '/admin/settings' },
            { icon: Shield, label: 'Audit Log', href: '/admin/logs' },
            { icon: Users, label: 'Admin Users', href: '/admin/users' },
        ]
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { role } = useAdminRole();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        'Catalogue': true,
        'Orders': true,
        'Inventory': true
    });

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => { setMobileOpen(false); }, [pathname]);

    const handleLogout = async () => {
        try {
            await clearSession();
            await signOut(getAuth(app));
            router.push('/login');
        } catch {
            console.error('Logout failed');
        }
    };

    const isActive = (href: string, exact?: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

    const toggleGroup = (label: string) => {
        setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const filteredNavGroups = NAV_GROUPS.map(group => {
        const filteredItems = group.items.filter(item => {
            if (role === 'warehouse') return item.href.startsWith('/admin/stock') || item.href === '/admin/pos';
            if (role === 'staff') {
                const restrictedPaths = ['/admin/stores', '/admin/payment-settings', '/admin/logs', '/admin/users'];
                return !restrictedPaths.some(p => item.href.startsWith(p));
            }
            return true; 
        });
        return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white">
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
                <span className="text-lg font-black uppercase tracking-tighter text-gray-900">
                    Rud'Ark <span className="text-blue-600">Admin</span>
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                {filteredNavGroups.map((group) => {
                    const isGroupActive = group.items.some(item => isActive(item.href, (item as any).exact));
                    const isOpen = openGroups[group.label] || isGroupActive;

                    return (
                        <div key={group.label} className="mb-2">
                            <button
                                onClick={() => toggleGroup(group.label)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
                                    isGroupActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-900'
                                }`}
                            >
                                {group.label}
                                <ChevronRight 
                                    size={12} 
                                    className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
                                />
                            </button>
                            
                            <div className={`mt-1 space-y-0.5 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                {group.items.map((item) => {
                                    const active = isActive(item.href, (item as any).exact);
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-all ${
                                                active
                                                    ? 'bg-blue-50 text-blue-700 font-bold border-r-2 border-blue-600'
                                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                        >
                                            <Icon size={16} className={active ? 'text-blue-600' : 'text-gray-400'} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50 space-y-1">
                <Link
                    href="/"
                    target="_blank"
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-white border border-transparent hover:border-gray-200 rounded-sm transition-all"
                >
                    <ExternalLink size={14} />
                    Live Site
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-sm transition-all"
                >
                    <LogOut size={14} />
                    Logout
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
                <span className="text-base font-bold text-gray-900">
                    Rud'Ark <span className="text-blue-600">Admin</span>
                </span>
                <div className="flex items-center gap-2">
                    <Link href="/admin/orders/ship-scan" className="p-2 bg-blue-600 text-white rounded-lg">
                        <ScanLine size={18} />
                    </Link>
                    <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-500">
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                ${isMobile
                    ? `fixed top-14 left-0 h-[calc(100vh-56px)] z-50 transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
                    : 'fixed left-0 top-0 h-screen'
                }
                w-56 bg-white border-r border-gray-200 shadow-sm
            `}>
                <SidebarContent />
            </aside>
        </>
    );
}
