'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Tag, Settings, LogOut, ExternalLink, FolderTree, BarChart3, CreditCard } from 'lucide-react';

const NAV_ITEMS = [
    { icon: BarChart3, label: 'Dashboard', href: '/admin', exact: true },
    { icon: Package, label: 'Products', href: '/admin/products' },
    { icon: FolderTree, label: 'Categories', href: '/admin/categories' },
    { icon: Tag, label: 'Promos', href: '/admin/promos' },
    { icon: CreditCard, label: 'Payment Settings', href: '/admin/payment-settings' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

import { getAuth, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

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

    return (
        <aside className="w-64 bg-rudark-carbon border-r border-rudark-grey h-screen flex flex-col fixed left-0 top-0 z-50">
            {/* Brand Header */}
            <div className="h-20 flex items-center px-6 border-b border-rudark-grey">
                <span className="text-2xl font-condensed font-bold text-white uppercase tracking-wider">
                    Rud'Ark <span className="text-rudark-volt">Admin</span>
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 space-y-2">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-all group ${isActive
                                ? 'bg-rudark-volt text-black font-bold shadow-[0_0_15px_rgba(212,242,34,0.3)]'
                                : 'text-gray-400 hover:bg-rudark-matte hover:text-white'
                                }`}
                        >
                            <Icon size={20} className={isActive ? 'text-black' : 'group-hover:text-rudark-volt'} />
                            <span className={`font-condensed uppercase tracking-wide text-lg ${isActive ? 'font-bold' : ''}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-rudark-grey space-y-2">
                <Link href="/" target="_blank" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors">
                    <ExternalLink size={18} />
                    <span className="font-condensed uppercase tracking-wide">View Live Site</span>
                </Link>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-sm transition-colors"
                >
                    <LogOut size={18} />
                    <span className="font-condensed uppercase tracking-wide">Logout</span>
                </button>
            </div>
        </aside>
    );
}
