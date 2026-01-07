'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
    images: string[];
    onChange: (images: string[]) => void;
}

export default function ImageUploader({ images, onChange }: ImageUploaderProps) {
    const [urlInput, setUrlInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddUrl = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && urlInput) {
            e.preventDefault();
            onChange([...images, urlInput]);
            setUrlInput('');
        }
    };

    const removeImage = (index: number) => {
        onChange(images.filter((_, i) => i !== index));
    };

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;

        // Compress image using Canvas
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Aggressive max dimensions to strictly keep size under 1MB base64 limit
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress to JPEG 0.6 quality (aggressive compression)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

                // Double check size just in case (optional, but good for debugging)
                // console.log("Compressed size:", dataUrl.length);

                onChange([...images, dataUrl]);
            };
            img.src = readerEvent.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((url, index) => (
                    <div key={index} className="relative group aspect-square bg-rudark-carbon rounded-sm border border-rudark-grey overflow-hidden">
                        <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500/80 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}

                {/* Upload Placeholder */}
                <div
                    onClick={triggerFileInput}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`aspect-square bg-rudark-carbon border-2 border-dashed rounded-sm flex flex-col items-center justify-center text-gray-500 hover:text-rudark-volt hover:border-rudark-volt transition-colors cursor-pointer group ${isDragging ? 'border-rudark-volt text-rudark-volt bg-rudark-volt/5' : 'border-rudark-grey'}`}
                >
                    <Upload size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-mono uppercase text-center px-4">Drag & Drop or Click to Upload</span>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                </div>
            </div>

            {/* URL Input Fallback */}
            <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                    type="text"
                    placeholder="OR PASTE IMAGE URL & ENTER..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={handleAddUrl}
                    className="w-full bg-rudark-carbon text-white pl-10 pr-4 py-3 text-sm border border-rudark-grey focus:border-rudark-volt focus:outline-none placeholder-gray-600 font-mono uppercase rounded-sm"
                />
            </div>
            <p className="text-xs text-gray-500 font-mono">
                * Uploaded images will be converted to Base64 for immediate preview.
            </p>
        </div>
    );
}
