import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getPosts } from '@/actions/blog-actions';
import { BlogPost } from '@/types';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: "Blog | Rud'Ark PRO SHOP",
    description: "Technical gear guides, adventure stories, and professional diving insights from the Rud'Ark team.",
};

export default async function BlogPage() {
    const posts = await getPosts(true);

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl md:text-6xl font-black-ops uppercase tracking-wider mb-4">
                    The <span className="text-blue-500">Logbook</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl">
                    Technical gear guides, adventure stories, and professional diving insights from the Rud'Ark team.
                </p>
            </header>

            {posts.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-gray-400 text-xl font-teko uppercase tracking-widest">
                        New entries coming soon
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <BlogCard key={post.id} post={post} />
                    ))}
                </div>
            )}
        </main>
    );
}

function BlogCard({ post }: { post: BlogPost }) {
    const formattedDate = new Date(post.created_at?.seconds * 1000).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <Link 
            href={`/blog/${post.slug}`}
            className="group flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all duration-300"
        >
            <div className="relative aspect-video overflow-hidden">
                {post.cover_image ? (
                    <Image
                        src={post.cover_image}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <span className="text-gray-600 font-black-ops uppercase">Rud'Ark</span>
                    </div>
                )}
            </div>
            
            <div className="p-6 flex flex-col flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-widest font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                            {tag}
                        </span>
                    ))}
                </div>

                <h2 className="text-xl font-bold mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                    {post.title}
                </h2>

                <p className="text-gray-400 text-sm mb-6 line-clamp-3 flex-1">
                    {post.excerpt}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {formattedDate}
                    </span>
                    <span className="text-blue-400 text-xs font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                        Read More →
                    </span>
                </div>
            </div>
        </Link>
    );
}
