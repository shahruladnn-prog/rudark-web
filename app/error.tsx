'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Page Level Error:', error);
    }, [error]);

    return (
        <div className="min-h-[50vh] flex items-center justify-center p-8 bg-rudark-matte text-white">
            <div className="text-center max-w-md">
                <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
                <pre className="text-xs bg-black/50 p-4 rounded text-left mb-6 overflow-x-auto text-red-400">
                    {error.message}
                </pre>
                <button
                    onClick={() => reset()}
                    className="bg-rudark-volt text-black px-6 py-2 font-bold uppercase rounded-sm hover:bg-white transition-colors"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
