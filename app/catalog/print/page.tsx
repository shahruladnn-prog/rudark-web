'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { formatCatalogPrice } from '@/lib/catalog-utils';
import { CatalogItem } from '@/types';

function PrintContent() {
    const searchParams = useSearchParams();
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const skus = (searchParams.get('items') || '').split(',').filter(Boolean);
        if (!skus.length) {
            setLoaded(true);
            return;
        }
        fetch(`/api/catalog/items?skus=${encodeURIComponent(skus.join(','))}`)
            .then(r => r.json())
            .then(data => {
                setItems(data.items || []);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, [searchParams]);

    useEffect(() => {
        if (loaded && items.length > 0) {
            const t = setTimeout(() => window.print(), 500);
            return () => clearTimeout(t);
        }
    }, [loaded, items]);

    if (!loaded) {
        return <p className="p-8 text-center font-mono">Preparing PDF…</p>;
    }

    return (
        <div className="print-document max-w-3xl mx-auto p-8 bg-white text-black min-h-screen">
            <style jsx global>{`
                @media print {
                    body { background: white !important; color: black !important; }
                    nav, header, footer, .no-print { display: none !important; }
                }
                @media screen {
                    .print-document { box-shadow: 0 0 40px rgba(0,0,0,0.3); margin: 2rem auto; }
                }
            `}</style>
            <div className="border-b-4 border-[#D4F222] pb-4 mb-8">
                <img src="/logo.png" alt="Rud'Ark" className="h-16 w-auto mb-4" />
                <h1 className="text-3xl font-bold uppercase tracking-tight">Product Inquiry</h1>
                <p className="text-sm text-gray-600 mt-1">Rud&apos;Ark PRO SHOP · hello@rudark.my · +6013 551 8857</p>
                <p className="text-xs text-gray-500 mt-2">{new Date().toLocaleDateString('en-MY', { dateStyle: 'long' })}</p>
            </div>

            {items.length === 0 ? (
                <p>No items to print.</p>
            ) : (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-300 text-left uppercase text-xs tracking-wider">
                            <th className="py-2 w-8">#</th>
                            <th className="py-2 w-16"></th>
                            <th className="py-2">Product</th>
                            <th className="py-2">SKU</th>
                            <th className="py-2 text-right">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => {
                            const image = item.image_thumbnails?.[0] || item.images?.[0];
                            return (
                                <tr key={item.sku} className="border-b border-gray-200">
                                    <td className="py-3 align-top font-bold">{i + 1}</td>
                                    <td className="py-3 align-top">
                                        {image ? (
                                            <div className="relative w-12 h-14">
                                                <Image src={image} alt="" fill className="object-cover" sizes="48px" />
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="py-3 align-top font-semibold">{item.name}</td>
                                    <td className="py-3 align-top font-mono text-xs text-gray-600">{item.sku}</td>
                                    <td className="py-3 align-top text-right font-mono">{formatCatalogPrice(item) || 'Quote'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            <p className="text-xs text-gray-500 mt-8 border-t pt-4">
                Prices indicative. Final quote subject to MOQ, customization, and availability. rudark-web.vercel.app/catalog
            </p>
            <button
                type="button"
                onClick={() => window.print()}
                className="no-print mt-8 bg-[#D4F222] text-black font-bold px-6 py-2 uppercase text-sm"
            >
                Print / Save as PDF
            </button>
        </div>
    );
}

export default function CatalogPrintPage() {
    return (
        <Suspense fallback={<p className="p-8">Loading…</p>}>
            <PrintContent />
        </Suspense>
    );
}
