import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface ComingSoonProps {
    title?: string;
    message?: string;
    backLink?: string;
    backText?: string;
}

export default function ComingSoon({
    title = "Coming Soon",
    message = "This feature is under development. Check back soon!",
    backLink = "/shop",
    backText = "Back to Shop"
}: ComingSoonProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-rudark-matte px-4">
            <div className="text-center max-w-md">
                {/* Icon */}
                <div className="mb-8 inline-block">
                    <div className="w-24 h-24 bg-rudark-carbon border-2 border-rudark-volt rounded-sm flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-12 h-12 text-rudark-volt" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-6xl font-condensed font-bold uppercase text-white mb-4 tracking-wide">
                    {title}
                </h1>

                {/* Message */}
                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                    {message}
                </p>

                {/* Divider */}
                <div className="w-24 h-1 bg-rudark-volt mx-auto mb-8"></div>

                {/* Back Button */}
                <Link
                    href={backLink}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-rudark-carbon border-2 border-rudark-grey text-white hover:border-rudark-volt hover:text-rudark-volt transition-all font-condensed uppercase tracking-wider text-lg font-bold rounded-sm group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    {backText}
                </Link>

                {/* Tactical Grid Background */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `
                            linear-gradient(rgba(212, 242, 34, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(212, 242, 34, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }}></div>
                </div>
            </div>
        </div>
    );
}
