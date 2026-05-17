'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Plus, Check, Eye } from 'lucide-react';
import { CatalogItem } from '@/types';
import { CATALOG_TAG_LABELS, formatCatalogPrice } from '@/lib/catalog-utils';
import { useCatalogInquiry } from '@/context/catalog-inquiry-context';

interface CatalogProductCardProps {
    item: CatalogItem;
    viewMode?: 'grid' | 'list';
    onQuickView: (item: CatalogItem) => void;
}

export default function CatalogProductCard({ item, viewMode = 'grid', onQuickView }: CatalogProductCardProps) {
    const { addItem, hasItem } = useCatalogInquiry();
    const inList = hasItem(item.sku);
    const image = item.image_thumbnails?.[0] || item.images?.[0];
    const priceLabel = formatCatalogPrice(item);
    const tags = (item.catalog_tags || []).slice(0, 2);

    const purchaseBadge =
        item.purchase_mode === 'online'
            ? { label: 'Buy Online', className: 'bg-rudark-volt text-black' }
            : item.purchase_mode === 'inquire'
                ? { label: 'Inquire', className: 'bg-blue-600 text-white' }
                : { label: 'Portfolio', className: 'bg-gray-600 text-white' };

    const handleAdd = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (inList) return;
        addItem({
            sku: item.sku,
            name: item.name,
            image,
            source: item.source,
        });
    };

    if (viewMode === 'list') {
        return (
            <motion.div
                layout
                className="group flex gap-4 bg-rudark-carbon border border-rudark-grey/50 rounded-sm p-3 hover:border-rudark-volt transition-colors cursor-pointer"
                onClick={() => onQuickView(item)}
            >
                <div className="relative w-20 h-24 shrink-0 bg-white/5 overflow-hidden rounded-sm">
                    {image ? (
                        <Image src={image} alt={item.name} fill className="object-cover" sizes="80px" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px] font-mono">NO IMG</div>
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-condensed font-bold text-white uppercase truncate group-hover:text-rudark-volt">{item.name}</h3>
                        <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                        {item.moq ? (
                            <p className="text-xs text-gray-400 mt-1">
                                MOQ {item.moq} pcs{item.lead_time_days ? ` · ~${item.lead_time_days}d` : ''}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {priceLabel && <span className="font-mono text-rudark-volt text-sm font-bold">{priceLabel}</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 uppercase ${purchaseBadge.className}`}>{purchaseBadge.label}</span>
                        <button
                            type="button"
                            onClick={handleAdd}
                            className={`p-2 border rounded-sm transition-colors ${inList ? 'border-rudark-volt text-rudark-volt' : 'border-rudark-grey hover:border-rudark-volt text-white'}`}
                            aria-label={inList ? 'In inquiry list' : 'Add to inquiry'}
                        >
                            {inList ? <Check size={16} /> : <Plus size={16} />}
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative bg-rudark-carbon border border-rudark-grey/50 rounded-sm overflow-hidden hover:border-rudark-volt transition-all flex flex-col h-full"
        >
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-widest ${purchaseBadge.className}`}>
                    {purchaseBadge.label}
                </span>
                {item.catalog_featured && (
                    <span className="bg-orange-500 text-black text-[10px] font-bold px-2 py-1 uppercase">Featured</span>
                )}
            </div>

            <button type="button" className="block relative aspect-[4/5] bg-white/5 overflow-hidden w-full text-left" onClick={() => onQuickView(item)}>
                {image ? (
                    <Image src={image} alt={item.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono text-xs">NO IMAGE</div>
                )}
                <span className="absolute bottom-2 right-2 p-2 bg-black/70 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={16} className="text-white" />
                </span>
            </button>

            <div className="p-4 flex flex-col flex-1">
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {tags.map(tag => (
                            <span key={tag} className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-rudark-matte border border-rudark-grey text-gray-400">
                                {CATALOG_TAG_LABELS[tag] || tag}
                            </span>
                        ))}
                    </div>
                )}
                <button type="button" onClick={() => onQuickView(item)} className="text-left">
                    <h3 className="text-lg font-condensed font-bold text-white uppercase leading-tight mb-1 group-hover:text-rudark-volt line-clamp-2">
                        {item.name}
                    </h3>
                </button>
                {item.moq ? (
                    <p className="text-[10px] text-gray-500 font-mono mb-2">
                        MOQ {item.moq}{item.lead_time_days ? ` · ${item.lead_time_days}d lead` : ''}
                    </p>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    {priceLabel ? (
                        <span className="font-mono font-bold text-rudark-volt text-sm">{priceLabel}</span>
                    ) : (
                        <span className="text-xs text-gray-500 font-mono uppercase">On request</span>
                    )}
                    <button
                        type="button"
                        onClick={handleAdd}
                        className={`flex items-center gap-1 text-xs font-bold uppercase px-2 py-1.5 border rounded-sm transition-colors ${inList ? 'border-rudark-volt text-rudark-volt' : 'border-rudark-grey text-white hover:border-rudark-volt'}`}
                    >
                        {inList ? <><Check size={14} /> Added</> : <><Plus size={14} /> Inquiry</>}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
