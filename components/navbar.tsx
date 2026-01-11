'use client';

import Link from 'next/link';
import { ShoppingCart, Menu, X, Search, User } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { useState, useEffect, useRef } from 'react';
import MegaMenu from './mega-menu';
// import { CATEGORY_MAP } from '@/lib/categories'; // Removed
import AnnouncementBar from './announcement-bar';

interface NavbarProps {
    categories?: any[];
    settings?: any;
}

export default function Navbar({ categories = [], settings }: NavbarProps) {
    const { totalItems } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null); // Restored state

    const [scrolled, setScrolled] = useState(false);
    const closeTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = (menu: string) => {
        if (closeTimeout.current) {
            clearTimeout(closeTimeout.current);
            closeTimeout.current = null;
        }
        setActiveMenu(menu);
    };

    const handleMouseLeave = () => {
        closeTimeout.current = setTimeout(() => {
            setActiveMenu(null);
        }, 300); // Increased to 300ms for better UX
    };

    // Handle scroll effect for sticky header opacity
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setIsMenuOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <header className="fixed top-0 w-full z-50 pointer-events-none">
            {/* Pointer events auto so clicks work, but header itself passes through? No, wrapper needs pointer events. */}
            {/* Actually, if I make header fixed, it covers content. */}
            {/* The header wrapper should check height? No. */}
            {/* Let's just make it z-50 fixed. pointer-events-auto. */}
            <div className="pointer-events-auto">
                {settings && <AnnouncementBar settings={settings} />}

                <nav
                    className={`relative z-50 w-full transition-all duration-300 border-b ${scrolled || activeMenu || isMenuOpen
                        ? 'bg-rudark-matte/95 backdrop-blur-md border-rudark-grey/50'
                        : 'bg-transparent border-transparent'
                        }`}
                    onMouseLeave={handleMouseLeave}
                    onMouseEnter={() => { if (closeTimeout.current) clearTimeout(closeTimeout.current); }}
                >
                    <div className="max-w-7xl mx-auto px-4 md:px-8">
                        <div className="flex justify-between items-center h-20 md:h-24">

                            {/* Mobile Menu Button */}
                            <button
                                className="md:hidden p-2 text-white hover:text-rudark-volt"
                                onClick={() => setIsMenuOpen(true)}
                            >
                                <Menu size={24} />
                            </button>

                            {/* Logo - Centered on Mobile, Left on Desktop */}
                            <Link href="/" className="flex items-center gap-2 transform transition-transform hover:scale-105">
                                <img
                                    src="/logo.png"
                                    alt="Rud'Ark Logo"
                                    className="h-16 md:h-20 w-auto object-contain"
                                />
                            </Link>

                            {/* Desktop Nav - Mega Menu Triggers */}
                            <div className="hidden md:flex items-center space-x-12 h-full">
                                <div
                                    className="h-full flex items-center"
                                    onMouseEnter={() => handleMouseEnter('shop')}
                                >
                                    <Link
                                        href="/shop"
                                        className={`font-condensed font-bold text-lg tracking-widest uppercase transition-colors relative h-full flex items-center ${activeMenu === 'shop' ? 'text-rudark-volt' : 'text-white hover:text-rudark-volt'
                                            }`}
                                    >
                                        Shop
                                        {activeMenu === 'shop' && (
                                            <span className="absolute bottom-0 left-0 w-full h-1 bg-rudark-volt shadow-[0_0_10px_rgba(212,242,34,0.8)]" />
                                        )}
                                    </Link>
                                </div>

                                <Link href="/stories" className="font-condensed font-bold text-lg tracking-widest uppercase text-white hover:text-rudark-volt transition-colors">
                                    Stories
                                </Link>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-6">
                                <button className="text-gray-300 hover:text-white transition-colors">
                                    <Search size={20} />
                                </button>
                                <button className="text-gray-300 hover:text-white transition-colors hidden md:block">
                                    <User size={20} />
                                </button>
                                <Link href="/checkout" className="relative p-2 text-gray-300 hover:text-rudark-volt transition-colors group">
                                    <ShoppingCart size={22} className="group-hover:scale-110 transition-transform" />
                                    {totalItems > 0 && (
                                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold leading-none text-black bg-rudark-volt rounded-full">
                                            {totalItems}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Mega Menu Dropdown */}
                    <MegaMenu
                        isOpen={activeMenu === 'shop'}
                        categories={categories}
                    />
                </nav>

                {/* Mobile Sidebar & Backdrop */}
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[60] flex md:hidden">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setIsMenuOpen(false)}
                        />

                        {/* Drawer */}
                        <div className="relative w-4/5 max-w-sm bg-rudark-matte h-full border-r border-rudark-grey shadow-2xl overflow-y-auto">
                            <div className="p-6 flex justify-between items-center border-b border-rudark-grey/50">
                                <span className="text-xl font-condensed font-bold text-white uppercase">Menu</span>
                                <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 space-y-8">
                                {categories.map((cat: any) => (
                                    <div key={cat.slug}>
                                        <h3 className="text-rudark-volt font-condensed font-bold text-xl uppercase mb-4">{cat.name || cat.category_name}</h3>
                                        <ul className="space-y-4 border-l border-rudark-grey/30 pl-4">
                                            {(cat.subcategories || []).map((sub: any) => (
                                                <li key={sub.slug}>
                                                    <Link
                                                        href={`/shop/${cat.slug}/${sub.slug}`}
                                                        className="block text-gray-300 text-sm hover:text-white py-1 uppercase"
                                                        onClick={() => setIsMenuOpen(false)}
                                                    >
                                                        {sub.name}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}

                                <div className="pt-8 border-t border-rudark-grey/30">
                                    <Link href="/stories" className="block text-lg font-condensed font-bold text-white uppercase mb-4">Stories</Link>
                                    <Link href="/account" className="block text-lg font-condensed font-bold text-white uppercase">Account</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Backdrop for Desktop Menu */}
                {activeMenu && (
                    <div
                        className="fixed inset-0 bg-black/60 z-30 transition-opacity duration-300"
                        style={{ top: '6rem' }} // Offset below navbar
                    />
                )}
            </div>
        </header>
    );
}
