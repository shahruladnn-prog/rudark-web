import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getCatalogItemsBySkus } from '@/actions/catalog-actions';
import { formatCatalogPrice } from '@/lib/catalog-utils';

export const metadata: Metadata = {
    title: "Shared Catalog Selection | Rud'Ark",
    robots: { index: false, follow: false },
};

interface SharePageProps {
    searchParams: Promise<{ items?: string }>;
}

export default async function CatalogSharePage({ searchParams }: SharePageProps) {
    const params = await searchParams;
    const skus = (params.items || '').split(',').map(s => s.trim()).filter(Boolean);
    const items = skus.length ? await getCatalogItemsBySkus(skus) : [];

    return (
        <div className="min-h-screen bg-rudark-matte pt-32 pb-20">
            <div className="max-w-4xl mx-auto px-4 md:px-8">
                <div className="mb-10 border-b border-rudark-grey pb-8">
                    <Link href="/catalog" className="text-rudark-volt font-mono text-xs uppercase hover:text-white mb-4 inline-block">
                        ← Back to catalog
                    </Link>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase">Shared selection</h1>
                    <p className="text-gray-400 mt-2 font-mono text-sm">
                        {items.length} item{items.length !== 1 ? 's' : ''} · Rud&apos;Ark PRO SHOP
                    </p>
                </div>

                {items.length === 0 ? (
                    <p className="text-gray-500 text-center py-16">No items in this link or items are no longer available.</p>
                ) : (
                    <ul className="space-y-6">
                        {items.map((item, i) => {
                            const image = item.image_thumbnails?.[0] || item.images?.[0];
                            const price = formatCatalogPrice(item);
                            return (
                                <li
                                    key={item.sku}
                                    className="flex gap-4 bg-rudark-carbon border border-rudark-grey/50 p-4 rounded-sm"
                                >
                                    <span className="font-mono text-rudark-volt text-lg font-bold w-8 shrink-0">{i + 1}</span>
                                    <div className="relative w-20 h-24 shrink-0 bg-white/5 rounded-sm overflow-hidden">
                                        {image ? (
                                            <Image src={image} alt={item.name} fill className="object-cover" sizes="80px" />
                                        ) : null}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="font-condensed font-bold text-white uppercase text-lg">{item.name}</h2>
                                        <p className="font-mono text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
                                        {price && <p className="font-mono text-rudark-volt font-bold mt-2">{price}</p>}
                                        {item.moq ? (
                                            <p className="text-xs text-gray-400 mt-1">MOQ {item.moq} pcs</p>
                                        ) : null}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="mt-12 p-6 bg-rudark-carbon border border-rudark-volt/30 rounded-sm text-center">
                    <p className="text-gray-400 text-sm mb-4">Interested in this selection?</p>
                    <Link
                        href="/contact?subject=wholesale"
                        className="inline-block bg-rudark-volt text-black font-bold px-8 py-3 uppercase text-sm tracking-wider rounded-sm hover:bg-white"
                    >
                        Contact Rud&apos;Ark
                    </Link>
                </div>
            </div>
        </div>
    );
}
