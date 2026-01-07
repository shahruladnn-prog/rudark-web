'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="bg-rudark-matte text-white p-10 font-sans">
                <div className="max-w-xl mx-auto border border-red-500 p-8 rounded bg-rudark-carbon">
                    <h2 className="text-2xl font-bold mb-4 text-red-500">CRITICAL SYSTEM FAILURE</h2>
                    <p className="mb-4">The application crashed during the root layout render.</p>
                    <pre className="bg-black p-4 rounded text-xs mb-6 overflow-auto border border-gray-800">
                        {error.message}
                        {error.digest && `\nDigest: ${error.digest}`}
                    </pre>
                    <button
                        onClick={() => reset()}
                        className="bg-rudark-volt text-black px-6 py-2 font-bold uppercase"
                    >
                        Attempt System Reset
                    </button>
                </div>
            </body>
        </html>
    );
}
