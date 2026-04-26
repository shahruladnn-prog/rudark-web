import type { Metadata } from 'next';
import ContactClient from './contact-client';

export const metadata: Metadata = {
    title: "Contact | Rud'Ark PRO SHOP",
    description: "Get in touch with Rud'Ark. Order inquiries, product questions, wholesale, or just say hi — we're based in Gopeng, Perak, Malaysia.",
    openGraph: {
        title: "Contact | Rud'Ark PRO SHOP",
        description: "Reach out to the Rud'Ark team. Based in Gopeng, Perak, Malaysia.",
        url: 'https://rudark-web.vercel.app/contact',
        siteName: "Rud'Ark",
        images: [{ url: 'https://rudark-web.vercel.app/logo.png', width: 800, height: 800, alt: "Rud'Ark Logo" }],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: "Contact | Rud'Ark PRO SHOP",
        description: "Reach out to the Rud'Ark team. Based in Gopeng, Perak, Malaysia.",
        images: ['https://rudark-web.vercel.app/logo.png'],
    },
};

export default function ContactPage() {
    return <ContactClient />;
}
