'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Instagram, Facebook, Youtube } from 'lucide-react';

export default function FloatingSocial() {
    const [visible, setVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Auto-hide on scroll down (mobile only)
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Only apply auto-hide on mobile
            if (window.innerWidth < 1024) {
                setVisible(currentScrollY < lastScrollY || currentScrollY < 100);
            } else {
                setVisible(true);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const socialLinks = [
        {
            name: 'TikTok',
            href: 'https://www.tiktok.com/@rudark.my',
            icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
            )
        },
        {
            name: 'Instagram',
            href: 'https://www.instagram.com/rudark.my/',
            icon: <Instagram className="w-5 h-5" />
        },
        {
            name: 'Facebook',
            href: 'https://www.facebook.com/rudaark/',
            icon: <Facebook className="w-5 h-5" />
        },
        {
            name: 'YouTube',
            href: 'https://www.youtube.com/@rudark',
            icon: <Youtube className="w-5 h-5" />
        }
    ];

    return (
        <>
            {/* Desktop: Vertical sidebar on right */}
            <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-50">
                {socialLinks.map((social) => (
                    <Link
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 bg-rudark-carbon border-2 border-rudark-grey rounded-sm flex items-center justify-center text-gray-400 hover:text-rudark-volt hover:border-rudark-volt hover:scale-110 transition-all duration-300 group"
                        aria-label={social.name}
                    >
                        {social.icon}
                    </Link>
                ))}
            </div>

            {/* Mobile: Horizontal bar at bottom */}
            <div
                className={`lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-50 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
                    }`}
            >
                <div className="bg-rudark-carbon border-2 border-rudark-grey rounded-sm shadow-2xl flex gap-3 px-4 py-3">
                    {socialLinks.map((social) => (
                        <Link
                            key={social.name}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-rudark-volt active:scale-95 transition-all duration-200"
                            aria-label={social.name}
                        >
                            {social.icon}
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}
