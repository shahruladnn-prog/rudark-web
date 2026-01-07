export interface Product {
    id?: string;
    sku: string; // The specific link to Loyverse
    name: string;
    description: string;
    web_price: number; // The standard retail price
    promo_price?: number; // Optional sale price (if set, show strike-through on frontend)
    images: string[];
    category_slug: string; // From the new Category Map
    subcategory_slug?: string; // DEPRECATED: Keep for now to avoid breakages during migration
    subcategory_slugs?: string[]; // New Support for multiple subcategories
    stock_status: 'IN_STOCK' | 'LOW' | 'OUT' | 'ARCHIVED'; // Calculated from Loyverse
    is_featured: boolean; // For "New Arrivals" or "Hero" sections
    tags: string[]; // For search optimization
    loyverse_id?: string; // Reference ID
    created_at: any;
    updated_at: any;
    // Legacy fields to be potentially deprecated or mapped
    loyverse_item_id?: string;
    loyverse_variant_id?: string;
    category?: string; // Legacy string category
}

export interface CartItem extends Product {
    quantity: number;
}

export interface Category {
    id?: string;
    name: string;
    slug: string;
    category_name?: string; // Legacy support
    image?: string; // URL for homepage/mega menu
    order?: number;
    subcategories?: {
        name: string;
        slug: string;
    }[];
    created_at?: any;
    updated_at?: any;
}
