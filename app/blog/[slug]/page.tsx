import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug } from '@/actions/blog-actions';
import { BlogPost } from '@/types';

export const revalidate = 3600;

interface Props {
    params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const post = await getPostBySlug(params.slug);
    if (!post) return { title: 'Post Not Found' };

    return {
        title: `${post.title} | Rud'Ark Blog`,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            images: post.cover_image ? [{ url: post.cover_image }] : [],
            type: 'article',
            publishedTime: post.created_at?.seconds ? new Date(post.created_at.seconds * 1000).toISOString() : undefined,
            modifiedTime: post.updated_at?.seconds ? new Date(post.updated_at.seconds * 1000).toISOString() : undefined,
            tags: post.tags,
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const post = await getPostBySlug(params.slug);

    if (!post || !post.published) {
        notFound();
    }

    const formattedDate = new Date(post.created_at?.seconds * 1000).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.excerpt,
        image: post.cover_image,
        datePublished: new Date(post.created_at?.seconds * 1000).toISOString(),
        dateModified: new Date(post.updated_at?.seconds * 1000).toISOString(),
        author: {
            '@type': 'Organization',
            name: "Rud'Ark PRO SHOP",
            url: 'https://rudark-web.vercel.app'
        },
        publisher: {
            '@type': 'Organization',
            name: "Rud'Ark PRO SHOP",
            logo: {
                '@type': 'ImageObject',
                url: 'https://rudark-web.vercel.app/logo.png'
            }
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://rudark-web.vercel.app/blog/${post.slug}`
        }
    };

    return (
        <main className="min-h-screen pt-24 pb-16 px-4 max-w-4xl mx-auto">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <article>
                <header className="mb-12">
                    <div className="flex flex-wrap gap-2 mb-6">
                        {post.tags.map(tag => (
                            <span key={tag} className="text-[10px] uppercase tracking-widest font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                                {tag}
                            </span>
                        ))}
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl font-black-ops uppercase tracking-wider mb-6">
                        {post.title}
                    </h1>

                    <div className="flex items-center gap-4 text-gray-500 text-sm uppercase tracking-widest mb-8">
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span>Rud'Ark Team</span>
                    </div>

                    {post.cover_image && (
                        <div className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-white/10 mb-12">
                            <Image
                                src={post.cover_image}
                                alt={post.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    <p className="text-xl text-gray-400 font-medium leading-relaxed italic border-l-4 border-blue-500 pl-6">
                        {post.excerpt}
                    </p>
                </header>

                <div className="prose prose-invert prose-blue max-w-none prose-headings:font-teko prose-headings:uppercase prose-headings:tracking-widest prose-h1:text-4xl prose-h2:text-3xl prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-gray-300">
                    <ReactMarkdown>{post.body}</ReactMarkdown>
                </div>
                
                <footer className="mt-16 pt-8 border-t border-white/10">
                    <Link 
                        href="/blog"
                        className="text-blue-500 font-bold uppercase tracking-widest hover:text-blue-400 transition-colors"
                    >
                        ← Back to Logbook
                    </Link>
                </footer>
            </article>
        </main>
    );
}
