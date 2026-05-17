'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, ChevronLeft, ChevronRight, Plus, Check, ExternalLink, MessageCircle, Mail } from 'lucide-react';
import { CatalogItem } from '@/types';
import { CATALOG_TAG_LABELS, formatCatalogPrice, buildWhatsAppUrl } from '@/lib/catalog-utils';
import { useCatalogInquiry } from '@/context/catalog-inquiry-context';

interface CatalogQuickViewProps {
    item: CatalogItem | null;
    onClose: () => void;
}

export default function CatalogQuickView({ item, onClose }: CatalogQuickViewProps) {
    const { addItem, hasItem } = useCatalogInquiry();
    const [imageIndex, setImageIndex] = useState(0);

    useEffect(() => {
        setImageIndex(0);
    }, [item?.sku]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!item) return null;

    const images = item.images?.length ? item.images : [];
    const inList = hasItem(item.sku);
    const priceLabel = formatCatalogPrice(item);
    const canBuyOnline = item.purchase_mode === 'online' && item.is_public !== false && item.source === 'product';
    const waUrl = buildWhatsAppUrl([{ name: item.name, sku: item.sku }]);

    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-[70]" onClick={onClose} aria-hidden />
            <div
                className="fixed top-0 right-0 h-full w-full md:w-[min(480px,90vw)] bg-rudark-matte border-l border-rudark-grey z-[71] flex flex-col shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={`Quick view: ${item.name}`}
            >
                <div className="flex items-center justify-between p-4 border-b border-rudark-grey shrink-0">
                    <span className="font-mono text-xs text-gray-500 uppercase">Quick View</span>
                    <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-white" aria-label="Close">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="relative aspect-square bg-rudark-carbon">
                        {images[imageIndex] ? (
                            <Image src={images[imageIndex]} alt={item.name} fill className="object-cover" sizes="480px" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono text-sm">NO IMAGE</div>
                        )}
                        {images.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-sm text-white"
                                    onClick={() => setImageIndex(i => (i - 1 + images.length) % images.length)}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 rounded-sm text-white"
                                    onClick={() => setImageIndex(i => (i + 1) % images.length)}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <p className="font-mono text-xs text-rudark-volt mb-1">{item.sku}</p>
                            <h2 className="text-3xl font-condensed font-bold text-white uppercase leading-tight">{item.name}</h2>
                            {priceLabel && <p className="font-mono text-xl text-rudark-volt font-bold mt-2">{priceLabel}</p>}
                        </div>

                        {(item.catalog_tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {item.catalog_tags!.map(tag => (
                                    <span key={tag} className="text-xs font-mono uppercase px-2 py-1 border border-rudark-grey text-gray-400">
                                        {CATALOG_TAG_LABELS[tag] || tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {(item.moq || item.lead_time_days || item.customizable) && (
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {item.moq ? (
                                    <div className="bg-rudark-carbon border border-rudark-grey p-2 rounded-sm">
                                        <p className="text-[10px] text-gray-500 uppercase">MOQ</p>
                                        <p className="font-mono text-white font-bold">{item.moq}</p>
                                    </div>
                                ) : null}
                                {item.lead_time_days ? (
                                    <div className="bg-rudark-carbon border border-rudark-grey p-2 rounded-sm">
                                        <p className="text-[10px] text-gray-500 uppercase">Lead</p>
                                        <p className="font-mono text-white font-bold">{item.lead_time_days}d</p>
                                    </div>
                                ) : null}
                                {item.customizable ? (
                                    <div className="bg-rudark-carbon border border-rudark-grey p-2 rounded-sm">
                                        <p className="text-[10px] text-gray-500 uppercase">Custom</p>
                                        <p className="font-mono text-rudark-volt font-bold text-xs">Yes</p>
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {item.description && (
                            <p className="text-gray-400 text-sm leading-relaxed line-clamp-6">{item.description}</p>
                        )}

                        {item.source === 'product' && (
                            <Link
                                href={`/product/${item.sku}`}
                                className="inline-flex items-center gap-2 text-sm text-rudark-volt hover:text-white font-mono uppercase"
                            >
                                Open full page <ExternalLink size={14} />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-rudark-grey space-y-2 shrink-0 bg-rudark-matte">
                    <button
                        type="button"
                        onClick={() => !inList && addItem({ sku: item.sku, name: item.name, image: images[0], source: item.source })}
                        disabled={inList}
                        className={`w-full flex items-center justify-center gap-2 py-3 font-bold uppercase tracking-wider rounded-sm ${inList ? 'bg-rudark-carbon text-rudark-volt border border-rudark-volt' : 'bg-rudark-volt text-black hover:bg-white'}`}
                    >
                        {inList ? <><Check size={18} /> In inquiry list</> : <><Plus size={18} /> Add to inquiry</>}
                    </button>
                    {canBuyOnline && (
                        <Link
                            href={`/product/${item.sku}`}
                            className="w-full flex items-center justify-center gap-2 py-3 font-bold uppercase tracking-wider rounded-sm border border-rudark-volt text-rudark-volt hover:bg-rudark-volt hover:text-black transition-colors"
                        >
                            Buy online
                        </Link>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-black font-bold text-xs uppercase rounded-sm">
                            <MessageCircle size={16} /> WhatsApp
                        </a>
                        <a
                            href={`mailto:hello@rudark.my?subject=${encodeURIComponent(`Inquiry: ${item.name}`)}&body=${encodeURIComponent(`Hi, I would like to inquire about ${item.name} (SKU: ${item.sku}).`)}`}
                            className="flex items-center justify-center gap-2 py-2.5 border border-rudark-grey text-white font-bold text-xs uppercase rounded-sm hover:border-white"
                        >
                            <Mail size={16} /> Email
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
