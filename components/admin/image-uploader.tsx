'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface ImageUploaderProps {
    images: string[];
    onChange: (images: string[]) => void;
    thumbnails?: string[];
    onChangeThumbnails?: (thumbnails: string[]) => void;
}

async function compressToBlob(file: File, maxDim: number, quality = 0.82): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
    return new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/webp', quality)
    );
}

async function compressAndUpload(file: File): Promise<{ full: string; thumb: string }> {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');

    const [fullBlob, thumbBlob] = await Promise.all([
        compressToBlob(file, 800),
        compressToBlob(file, 300, 0.80),
    ]);

    const fullStorageRef = ref(storage, `products/${timestamp}_${safeName}.webp`);
    const thumbStorageRef = ref(storage, `products/thumbs/${timestamp}_${safeName}.webp`);

    const [fullSnap, thumbSnap] = await Promise.all([
        uploadBytes(fullStorageRef, fullBlob, { contentType: 'image/webp' }),
        uploadBytes(thumbStorageRef, thumbBlob, { contentType: 'image/webp' }),
    ]);

    const [fullUrl, thumbUrl] = await Promise.all([
        getDownloadURL(fullSnap.ref),
        getDownloadURL(thumbSnap.ref),
    ]);

    return { full: fullUrl, thumb: thumbUrl };
}

function isStorageUrl(url: string): boolean {
    return url.startsWith('https://firebasestorage.googleapis.com') ||
        url.startsWith('https://storage.googleapis.com');
}

export default function ImageUploader({ images, onChange, thumbnails, onChangeThumbnails }: ImageUploaderProps) {
    const [urlInput, setUrlInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddUrl = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && urlInput.trim()) {
            e.preventDefault();
            onChange([...images, urlInput.trim()]);
            setUrlInput('');
        }
    };

    const removeImage = async (index: number) => {
        const url = images[index];
        const thumbUrl = thumbnails?.[index];
        const deletions: Promise<void>[] = [];
        if (isStorageUrl(url)) deletions.push(deleteObject(ref(storage, url)).catch(() => {}));
        if (thumbUrl && isStorageUrl(thumbUrl)) deletions.push(deleteObject(ref(storage, thumbUrl)).catch(() => {}));
        await Promise.all(deletions);
        onChange(images.filter((_, i) => i !== index));
        if (thumbnails) onChangeThumbnails?.(thumbnails.filter((_, i) => i !== index));
    };

    const processFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setUploading(true);
        try {
            const { full, thumb } = await compressAndUpload(file);
            onChange([...images, full]);
            onChangeThumbnails?.([...(thumbnails || []), thumb]);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            processFile(e.target.files[0]);
            e.target.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((url, index) => (
                    <div key={index} className="relative group aspect-square bg-gray-100 rounded border border-gray-200 overflow-hidden">
                        <img src={thumbnails?.[index] || url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500/80 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {/* Upload slot */}
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    className={`aspect-square border-2 border-dashed rounded flex flex-col items-center justify-center transition-colors ${
                        uploading
                            ? 'border-blue-300 bg-blue-50 cursor-wait'
                            : isDragging
                            ? 'border-blue-400 bg-blue-50 cursor-copy'
                            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                    }`}
                >
                    {uploading ? (
                        <>
                            <Loader2 size={28} className="mb-2 text-blue-500 animate-spin" />
                            <span className="text-xs text-blue-500 font-medium">Uploading…</span>
                        </>
                    ) : (
                        <>
                            <Upload size={28} className="mb-2 text-gray-400" />
                            <span className="text-xs text-gray-500 text-center px-3">Drag & drop or click</span>
                            <span className="text-[10px] text-gray-400 mt-1">800px full + 300px thumb</span>
                        </>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                </div>
            </div>

            {/* URL fallback */}
            <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                    type="text"
                    placeholder="Or paste image URL and press Enter…"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={handleAddUrl}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 text-gray-900 placeholder-gray-400"
                />
            </div>
            <p className="text-xs text-gray-400">
                Uploaded as WebP: 800px full + 300px thumbnail. Existing base64/URL images display normally.
            </p>
        </div>
    );
}
