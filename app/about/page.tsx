'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Award, Users, Calendar, Target } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-rudark-matte text-white">

            {/* Hero Section */}
            <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
                <Image
                    src="/561850166_122153438654703048_8869634204382287531_n.jpg"
                    alt="Rud'Ark - Build for the Bold"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rudark-matte via-rudark-matte/60 to-transparent" />

                {/* Back Button */}
                <Link
                    href="/"
                    className="absolute top-24 left-6 md:left-12 z-20 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-mono uppercase">Back</span>
                </Link>

                {/* Hero Text */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                    <div className="max-w-5xl mx-auto">
                        <span className="text-rudark-volt font-mono text-xs md:text-sm tracking-widest uppercase">Our Story</span>
                        <h1 className="text-4xl md:text-7xl font-condensed font-bold uppercase mt-2 leading-none">
                            Rud'Ark: <span className="text-transparent bg-clip-text bg-gradient-to-r from-rudark-volt to-white">The Story</span>
                        </h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 md:px-12 py-16">

                {/* Philosophy Section */}
                <section className="mb-20">
                    <div className="flex items-center gap-3 mb-6">
                        <Target className="text-rudark-volt" size={24} />
                        <h2 className="text-2xl md:text-3xl font-condensed font-bold uppercase">Brand Philosophy</h2>
                    </div>
                    <div className="bg-rudark-carbon border-l-4 border-rudark-volt p-6 md:p-8 rounded-r-sm mb-8">
                        <p className="text-2xl md:text-4xl font-condensed font-bold text-rudark-volt uppercase mb-2">
                            "Build for the Bold"
                        </p>
                        <p className="text-gray-400 italic">The "Rude Ark" — Bahtera Liar (The Wild Ark)</p>
                    </div>

                    <p className="text-gray-300 leading-relaxed mb-6">
                        The name <strong className="text-white">Rud'Ark</strong> is a phonetic evolution of the phrase "Rude Ark"—or in our native spirit, the <strong className="text-rudark-volt">"Bahtera Liar"</strong> (The Wild Ark). It captures the duality of the adventurer's existence:
                    </p>

                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6">
                            <h3 className="text-xl font-condensed font-bold text-rudark-volt uppercase mb-3">"Rude" — The Wild</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                We embrace the archaic definition of the word—raw, rough, and vigorous. It represents the primitive force of the river, the jagged limestone cliffs, and the unforgiving nature of the rainforest.
                            </p>
                        </div>
                        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6">
                            <h3 className="text-xl font-condensed font-bold text-rudark-volt uppercase mb-3">"Ark" — The Sanctuary</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                A vessel of safety designed to withstand the flood. Rud'Ark is the gear that stands between you and the elements. We are the sanctuary in the storm.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Timeline Section */}
                <section className="mb-20">
                    <div className="flex items-center gap-3 mb-8">
                        <Calendar className="text-rudark-volt" size={24} />
                        <h2 className="text-2xl md:text-3xl font-condensed font-bold uppercase">Our Evolution: A Decade in the Making</h2>
                    </div>

                    <div className="space-y-8">
                        {/* 2015 */}
                        <div className="relative pl-8 border-l-2 border-rudark-grey">
                            <div className="absolute left-0 top-0 w-4 h-4 bg-rudark-volt rounded-full transform -translate-x-[9px]" />
                            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6">
                                <span className="text-rudark-volt font-mono text-sm">2015</span>
                                <h3 className="text-xl font-condensed font-bold uppercase mt-1 mb-3">The Origin & The Hustle</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    The concept was forged in the rapids. Founded in 2015 by <strong className="text-white">Arif Azmi</strong> and <strong className="text-white">Nizam Majid</strong>, Rud'Ark began as Rud'Ark Kayak. It was the era of the "one-man operation"—defined by long days, manual labor, and a grit that can only be learned on the river. At that time, our "Ark" was literal—a humble kayak piloted by two friends fighting the rough waters, learning that in the wild, fragility is not an option.
                                </p>
                            </div>
                        </div>

                        {/* 2018-2024 */}
                        <div className="relative pl-8 border-l-2 border-rudark-grey">
                            <div className="absolute left-0 top-0 w-4 h-4 bg-rudark-volt rounded-full transform -translate-x-[9px]" />
                            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6">
                                <span className="text-rudark-volt font-mono text-sm">2018 – 2024</span>
                                <h3 className="text-xl font-condensed font-bold uppercase mt-1 mb-3">The Growth of an Ecosystem</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    While the Rud'Ark name went dormant, the vision exploded. Under the leadership of Arif Azmi, the mission expanded from a single product into a complete tourism ecosystem. This period saw the birth of <strong className="text-white">GGP Holdings Sdn Bhd</strong>, growing from a local campsite into a corporate group managing premier destinations like <strong className="text-rudark-volt">Gopeng Glamping Park</strong> and <strong className="text-rudark-volt">Putrajaya Adventure Park</strong>. We spent a decade testing our mettle, growing from a solo mission into a workforce of <strong className="text-white">150+ professionals</strong> who live and breathe the outdoors.
                                </p>
                            </div>
                        </div>

                        {/* 2025 */}
                        <div className="relative pl-8 border-l-2 border-rudark-volt">
                            <div className="absolute left-0 top-0 w-4 h-4 bg-rudark-volt rounded-full transform -translate-x-[9px] ring-4 ring-rudark-volt/30" />
                            <div className="bg-gradient-to-r from-rudark-volt/10 to-rudark-carbon border border-rudark-volt/50 rounded-sm p-6">
                                <span className="text-rudark-volt font-mono text-sm font-bold">2025</span>
                                <h3 className="text-xl font-condensed font-bold uppercase mt-1 mb-3">The Revival</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    On <strong className="text-white">January 8, 2025</strong>, the circle was completed. With the infrastructure of GGP Holdings as our backbone, we established <strong className="text-rudark-volt">GGP Resources Sdn Bhd</strong> to officially revive Rud'Ark. No longer just a kayak, Rud'Ark returned as a premium adventure brand—channeling ten years of operational expertise into gear that is built to lead.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Achievement Section */}
                <section className="mb-20">
                    <div className="flex items-center gap-3 mb-8">
                        <Award className="text-rudark-volt" size={24} />
                        <h2 className="text-2xl md:text-3xl font-condensed font-bold uppercase">Our Commitment: World-Class from Day One</h2>
                    </div>

                    <div className="bg-gradient-to-br from-rudark-carbon to-black border border-rudark-volt rounded-sm p-8 md:p-12 text-center">
                        <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">We are proud to be the</p>
                        <h3 className="text-3xl md:text-5xl font-condensed font-bold text-white uppercase mb-2">
                            Official Boat Sponsor
                        </h3>
                        <p className="text-xl md:text-2xl font-condensed text-rudark-volt uppercase mb-6">
                            IRF World Rafting Championship 2025 – Malaysia
                        </p>
                        <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
                            From a local "Bahtera Liar" to the chosen vessel for the world's elite athletes, we have proven that our gear is ready for the highest level of the sport. When Rud'Ark brings equipment to the table, we bring nothing less than the best.
                        </p>
                    </div>

                    <p className="text-center text-2xl md:text-4xl font-condensed font-bold mt-12 text-white">
                        Rud'Ark. <span className="text-rudark-volt">Build for the Bold.</span>
                    </p>
                </section>

                {/* Company Info */}
                <section className="border-t border-rudark-grey pt-12">
                    <div className="flex items-center gap-3 mb-6">
                        <Users className="text-rudark-volt" size={24} />
                        <h2 className="text-2xl md:text-3xl font-condensed font-bold uppercase">The Company</h2>
                    </div>

                    <div className="flex flex-col md:flex-row items-start gap-8">
                        <Image
                            src="/GGPR white LOGO-01.png"
                            alt="GGP Resources Sdn Bhd"
                            width={180}
                            height={60}
                            className="object-contain"
                        />
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">GGP Resources Sdn Bhd</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                Lot 10846, Jalan Besar Kampung Chulek,<br />
                                31600 Gopeng, Perak, Malaysia
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm">
                                <a href="mailto:hello@rudark.my" className="text-rudark-volt hover:text-white transition-colors">
                                    hello@rudark.my
                                </a>
                                <a href="tel:+60135518857" className="text-rudark-volt hover:text-white transition-colors">
                                    +60 13-551 8857
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
