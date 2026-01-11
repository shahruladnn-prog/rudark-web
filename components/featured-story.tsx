import Link from 'next/link';

export default function FeaturedStory() {
    return (
        <section className="relative min-h-[80vh] flex items-center bg-rudark-matte text-white overflow-hidden">

            {/* Split Background */}
            <div className="absolute inset-0 flex flex-col md:flex-row">
                <div className="w-full md:w-1/2 h-1/2 md:h-full bg-rudark-carbon relative overflow-hidden">
                    {/* Image Side */}
                    <div className="absolute inset-0 bg-[url('/featured-mission-bg.jpg')] bg-cover bg-center opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
                </div>
                <div className="w-full md:w-1/2 h-1/2 md:h-full bg-rudark-matte" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

                {/* Left Content (Empty for image visibility or quote) */}
                <div className="hidden md:block">
                    <blockquote className="text-4xl font-condensed font-bold uppercase text-white/80 leading-none drop-shadow-md">
                        "The water doesn't care about your preparation. But we do."
                    </blockquote>
                </div>

                {/* Right Content */}
                <div className="py-12 md:py-0">
                    <span className="text-rudark-volt font-mono text-xs tracking-[0.3em] uppercase mb-6 block">
                        Featured Mission
                    </span>
                    <h2 className="text-5xl md:text-7xl font-condensed font-bold leading-none mb-8 uppercase">
                        Into The <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rudark-volt to-white">Unseen</span>
                    </h2>
                    <div className="w-24 h-1 bg-rudark-volt mb-8" />
                    <p className="text-lg text-gray-400 leading-relaxed mb-8 max-w-lg font-light">
                        From the glacial rivers of the north to the tropical depths of the equator,
                        our Pro Team pushes the limits of what's possible. Discover the gear that
                        survived the <span className="text-white font-medium">Project Abyss</span> expedition.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/stories/project-abyss" className="px-8 py-4 bg-white text-black font-condensed font-bold text-xl uppercase hover:bg-rudark-volt transition-colors text-center">
                            Read The Story
                        </Link>
                        <Link href="/shop/collections/expedition" className="px-8 py-4 border border-gray-600 text-white font-condensed font-bold text-xl uppercase hover:border-rudark-volt hover:text-rudark-volt transition-colors text-center">
                            Shop The Kit
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
