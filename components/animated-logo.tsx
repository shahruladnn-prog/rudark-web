'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function AnimatedLogo() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [frameIndex, setFrameIndex] = useState(1);
    const directionRef = useRef<1 | -1>(1); // 1 = forward, -1 = backward
    const frameRef = useRef(1);
    const lastUpdateRef = useRef(0);
    const FPS = 30;
    const interval = 1000 / FPS;

    // Preload Images
    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;

        const loadImages = async () => {
            const imageCount = 64;
            const imagePromises: Promise<HTMLImageElement>[] = [];

            // Load all images in parallel for faster loading
            for (let i = 1; i <= imageCount; i++) {
                const img = new Image();
                const paddedIndex = i.toString().padStart(3, '0');
                img.src = `/Sequence_Logo/ezgif-frame-${paddedIndex}.jpg`;
                imagePromises.push(new Promise((resolve) => {
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(img);
                }));
            }

            const loadedImages = await Promise.all(imagePromises);
            setImages(loadedImages);
            setIsLoading(false);
        };

        loadImages();
    }, []);

    // Animation Loop
    useEffect(() => {
        if (isLoading || images.length === 0) return;

        let animationFrameId: number;

        const animate = (timestamp: number) => {
            if (timestamp - lastUpdateRef.current >= interval) {
                lastUpdateRef.current = timestamp;

                const nextFrame = frameRef.current + directionRef.current;

                // Ping Pong Logic
                if (nextFrame >= 64) {
                    directionRef.current = -1;
                } else if (nextFrame <= 1) {
                    directionRef.current = 1;
                }

                frameRef.current = nextFrame < 1 ? 1 : nextFrame > 64 ? 64 : nextFrame;
                setFrameIndex(frameRef.current);
                render(frameRef.current);
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isLoading, images, interval]);

    // Render Canvas
    const render = (index: number) => {
        const canvas = canvasRef.current;
        if (!canvas || images.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let safeIndex = Math.floor(index) - 1;
        if (safeIndex < 0) safeIndex = 0;
        if (safeIndex >= images.length) safeIndex = images.length - 1;

        const img = images[safeIndex];
        if (!img) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const canvasRatio = rect.width / rect.height;
        const imgRatio = img.width / img.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasRatio > imgRatio) {
            drawHeight = rect.height;
            drawWidth = img.width * (rect.height / img.height);
            offsetX = (rect.width - drawWidth) / 2;
            offsetY = 0;
        } else {
            drawWidth = rect.width;
            drawHeight = img.height * (rect.width / img.width);
            offsetX = 0;
            offsetY = (rect.height - drawHeight) / 2;
        }

        ctx.clearRect(0, 0, rect.width, rect.height);
        // Draw with lower global alpha for built-in opacity control if needed, 
        // but CSS opacity is more performant for layout blending.
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };

    // Resize Handler
    useEffect(() => {
        if (!isLoading) {
            const handleResize = () => render(frameRef.current);
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [isLoading]);

    return (
        <div className="relative h-screen w-full bg-rudark-matte overflow-hidden border-b border-rudark-grey/50">

            {/* Canvas Layer - Deep Background */}
            <div className="absolute inset-0 z-0">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full object-cover md:object-contain opacity-25 mix-blend-lighten grayscale-[0.2]"
                // Opacity 0.25 blends it into background. mix-blend-lighten helps keep lights pop.
                />
                {/* Bottom gradient fade to blend with page content */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-rudark-matte to-transparent" />
            </div>

            {/* Radial vignetting to focus attention on center */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(18,18,18,0.8)_80%)] z-10 pointer-events-none" />

            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-rudark-matte">
                    <div className="w-12 h-12 border-4 border-rudark-volt border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Static Hero Content */}
            <div className="relative z-20 h-full flex flex-col justify-center pb-20 pt-32 md:pt-0 md:pb-0 items-center text-center px-4 max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    <h1 className="text-5xl md:text-9xl font-condensed font-bold text-white uppercase leading-none tracking-tighter mb-6 md:mb-10 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                        <span className="font-[family-name:var(--font-black-ops)] tracking-normal">Rud'Ark</span><br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rudark-volt to-white font-[family-name:var(--font-black-ops)] text-6xl md:text-[8.5rem]">PRO SHOP</span>
                    </h1>

                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 justify-center bg-black/40 backdrop-blur-sm p-8 rounded-sm border border-rudark-grey/20">
                        {/* Left: Tagline */}
                        <div className="flex items-center">
                            <div className="h-12 w-1 bg-rudark-volt mr-6 hidden md:block" />
                            <p className="text-3xl md:text-4xl text-white font-condensed font-bold tracking-widest uppercase whitespace-nowrap">
                                BUILD FOR<br />
                                <span className="text-rudark-volt glow-text">THE BOLD</span>
                            </p>
                        </div>

                        {/* Divider (Mobile hidden) */}
                        <div className="w-full h-px bg-rudark-grey/50 md:hidden" />
                        <div className="w-px h-16 bg-rudark-grey/50 hidden md:block" />

                        {/* Right: Description */}
                        <p className="text-gray-300 font-sans text-sm md:text-base leading-relaxed max-w-sm text-center md:text-left font-medium">
                            Designed for the obsessed. Engineered for the deep.
                            <br className="hidden md:block" />
                            <span className="text-white">Welcome to the apex of adventure gear.</span>
                        </p>
                    </div>

                    <div className="mt-12 group">
                        <button className="relative overflow-hidden bg-rudark-volt text-black font-condensed font-bold text-xl px-12 py-5 uppercase tracking-wider transition-all hover:scale-105 shadow-[0_0_20px_rgba(212,242,34,0.2)] hover:shadow-[0_0_40px_rgba(212,242,34,0.5)]">
                            <span className="relative z-10">Explore Collection</span>
                            <div className="absolute inset-0 bg-white/50 transform -skew-x-12 -translate-x-full group-hover:animate-shine" />
                        </button>
                    </div>
                </motion.div>
            </div>

            <style jsx global>{`
      @keyframes shine {
        100% {
          transform: translateX(200%) skewX(-12deg);
        }
      }
      .group-hover\:animate-shine:hover {
        animation: shine 1s;
      }
      .glow-text {
        text-shadow: 0 0 10px rgba(212, 242, 34, 0.5);
      }
    `}</style>
        </div>
    );
}
