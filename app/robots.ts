import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('http://localhost')
    ? 'https://rudark-web.vercel.app'
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://rudark-web.vercel.app');

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin/', '/api/', '/login', '/checkout/', '/orders/'],
            },
        ],
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    };
}
