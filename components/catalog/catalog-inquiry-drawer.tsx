'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X, Trash2, Share2, MessageCircle, Mail, FileDown, Send } from 'lucide-react';
import { useCatalogInquiry } from '@/context/catalog-inquiry-context';
import { buildEmailUrl, buildShareUrl, buildWhatsAppUrl } from '@/lib/catalog-utils';

export default function CatalogInquiryDrawer() {
    const { items, count, isOpen, setIsOpen, removeItem, updateNote, clearAll } = useCatalogInquiry();

    if (!isOpen) return null;

    const waUrl = items.length ? buildWhatsAppUrl(items) : '#';
    const emailUrl = items.length ? buildEmailUrl(items) : '#';
    const shareUrl = items.length ? buildShareUrl(items.map(i => i.sku)) : '#';

    const contactHref = items.length
        ? `/contact?inquiry=${encodeURIComponent(items.map(i => i.sku).join(','))}`
        : '/contact';

    const printHref = items.length
        ? `/catalog/print?items=${encodeURIComponent(items.map(i => i.sku).join(','))}`
        : '#';

    return (
        <>
            <div className="fixed inset-0 bg-black/70 z-[72]" onClick={() => setIsOpen(false)} aria-hidden />
            <div className="fixed top-0 right-0 h-full w-full md:w-[min(420px,95vw)] bg-rudark-matte border-l border-rudark-grey z-[73] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-rudark-grey">
                    <div>
                        <h2 className="font-condensed font-bold text-2xl text-white uppercase">Inquiry List</h2>
                        <p className="text-xs font-mono text-gray-500">{count} item{count !== 1 ? 's' : ''}</p>
                    </div>
                    <button type="button" onClick={() => setIsOpen(false)} className="p-2 text-gray-400 hover:text-white" aria-label="Close">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                            <p className="font-mono text-sm uppercase mb-2">No items yet</p>
                            <p className="text-sm">Browse the catalog and tap <strong className="text-white">Inquiry</strong> to build your list.</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.sku} className="flex gap-3 bg-rudark-carbon border border-rudark-grey/50 p-3 rounded-sm">
                                <div className="relative w-14 h-16 shrink-0 bg-white/5 rounded-sm overflow-hidden">
                                    {item.image ? (
                                        <Image src={item.image} alt="" fill className="object-cover" sizes="56px" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-600">—</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-condensed font-bold text-white uppercase text-sm truncate">{item.name}</p>
                                    <p className="text-[10px] font-mono text-gray-500 mb-2">{item.sku}</p>
                                    <input
                                        type="text"
                                        placeholder="Note (qty, color, event name…)"
                                        value={item.note || ''}
                                        onChange={e => updateNote(item.sku, e.target.value)}
                                        className="w-full bg-rudark-matte border border-rudark-grey text-xs text-white px-2 py-1.5 rounded-sm focus:border-rudark-volt focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.sku)}
                                    className="text-gray-500 hover:text-red-400 shrink-0 self-start p-1"
                                    aria-label="Remove"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {items.length > 0 && (
                    <div className="p-4 border-t border-rudark-grey space-y-2 bg-rudark-matte shrink-0">
                        <div className="grid grid-cols-2 gap-2">
                            <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 py-3 bg-[#25D366] text-black font-bold text-xs uppercase rounded-sm"
                            >
                                <MessageCircle size={16} /> WhatsApp all
                            </a>
                            <a href={emailUrl} className="flex items-center justify-center gap-2 py-3 border border-rudark-grey text-white font-bold text-xs uppercase rounded-sm hover:border-white">
                                <Mail size={16} /> Email all
                            </a>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard?.writeText(shareUrl);
                                }}
                                className="flex items-center justify-center gap-2 py-2.5 border border-rudark-grey text-gray-300 font-bold text-xs uppercase rounded-sm hover:border-rudark-volt hover:text-rudark-volt"
                            >
                                <Share2 size={14} /> Copy link
                            </button>
                            <a
                                href={printHref}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 py-2.5 border border-rudark-grey text-gray-300 font-bold text-xs uppercase rounded-sm hover:border-rudark-volt hover:text-rudark-volt"
                            >
                                <FileDown size={14} /> PDF / Print
                            </a>
                        </div>
                        <Link
                            href={contactHref}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-rudark-volt text-black font-bold text-xs uppercase rounded-sm hover:bg-white"
                        >
                            <Send size={16} /> Send inquiry form
                        </Link>
                        <button
                            type="button"
                            onClick={clearAll}
                            className="w-full py-2 text-xs font-mono text-gray-500 uppercase hover:text-red-400"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
