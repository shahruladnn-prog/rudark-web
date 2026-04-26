export interface VariantOption {
    name: string; // e.g. "Size", "Color"
    values: string[]; // e.g. ["S", "M", "L"], ["Red", "Blue"]
}

export interface CostLot {
    id: string;
    quantity: number;
    cost_price: number;
    supplier_name?: string;
    batch_number?: string;
    expiry_date?: any;
    created_at: any;
}

export interface ProductVariant {
    id: string; // Unique ID (e.g. generated UUID or hash)
    sku: string; // Unique SKU for this specific variation
    price: number; // Override base price
    promo_price?: number; // Optional promo price
    stock_status: 'IN_STOCK' | 'LOW' | 'OUT' | 'ARCHIVED' | 'CONTACT_US';
    options: Record<string, string>; // { "Size": "S", "Color": "Red" }
    image?: string; // Optional specific image
    // Stock tracking (synced from Loyverse)
    stock_quantity?: number;
    reserved_quantity?: number;
    loyverse_variant_id?: string;
    // Phase 4 fields
    cost_lots?: CostLot[];
    stock_web?: number;
    stock_shopee?: number;
    stock_lazada?: number;
    stock_tiktok?: number;
}

export interface Product {
    id?: string;
    sku: string; // Base SKU (or link to Loyverse Parent)
    name: string;
    description: string;
    web_price: number; // Base price (used if no variant selected or as default)
    promo_price?: number;
    cost_price?: number; // COGS / landed cost for margin calculations
    images: string[];
    image_thumbnails?: string[]; // 300px WebP thumbnails, parallel to images[]
    category_slug: string;
    subcategory_slug?: string;
    subcategory_slugs?: string[];
    stock_status: 'IN_STOCK' | 'LOW' | 'OUT' | 'ARCHIVED' | 'CONTACT_US';
    is_public: boolean; // Controls visibility on all shop pages
    is_home_public: boolean; // Controls visibility specifically on the HOME page
    is_featured: boolean;
    tags: string[];
    options?: VariantOption[]; // UI definitions: [ { name: "Size", values: ["S","M"] } ]
    variants?: ProductVariant[]; // The actual purchasable items
    loyverse_id?: string;
    created_at: any;
    updated_at: any;
    // Legacy fields
    loyverse_item_id?: string;
    loyverse_variant_id?: string;

    // Stock Management (NEW)
    stock_quantity?: number;        // Total stock from Loyverse
    reserved_quantity?: number;     // Currently reserved in checkouts
    last_stock_sync?: any;         // Timestamp of last Loyverse sync
    reorder_point?: number;        // Threshold for low stock warning
    safety_stock?: number;         // Buffer stock level

    // Phase 4 fields
    cost_lots?: CostLot[];
    stock_web?: number;
    stock_shopee?: number;
    stock_lazada?: number;
    stock_tiktok?: number;

    // Shipping
    weight?: number; // in KG
    length?: number; // in CM
    width?: number; // in CM
    height?: number; // in CM
    handling_fee?: number; // Flat fee in RM
    markup_amount?: number; // DEPRECATED: Flat markup in RM
    shipping_markup_percent?: number; // Percentage markup (e.g. 10 for 10%)

    // ParcelAsia Specifics
    parcel_size?: 'flyers_s' | 'flyers_m' | 'flyers_l' | 'flyers_xl' | 'box' | 'other';
    content_type?: 'general' | 'outdoors' | 'sports' | 'accessories' | 'muslimah' | 'health' | 'gadget_general' | 'others';

    category?: string;
}

export interface CartItem extends Product {
    quantity: number;
    selected_options?: Record<string, string>; // e.g. { "Size": "M", "Color": "Black" }
    variant_label?: string;
    stock_quantity?: number;
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

export interface StoreSettings {
    storeName: string;
    supportEmail: string;
    announcementText: string;
    announcementEnabled: boolean;
    businessAddress: string;
    taxRate: number;
    // Shipping Settings (for ParcelAsia sender details)
    phone?: string;
    address_line_1?: string;
    address_line_2?: string;
    postcode?: string;
    send_method?: 'pickup' | 'dropoff'; // ParcelAsia send method
}

export interface Review {
    id?: string;
    product_sku: string;
    customer_name: string;
    customer_email: string;
    rating: number; // 1-5
    body: string;
    status: 'pending' | 'approved';
    created_at: any;
}

export interface BlogPost {
    id?: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    cover_image: string;
    tags: string[];
    published: boolean;
    created_at: any;
    updated_at: any;
}

export type AdminRole = 'owner' | 'staff' | 'warehouse';

export interface AdminUser {
    uid: string;
    email: string;
    role: AdminRole;
    created_at: any;
    totp_enabled?: boolean;
    totp_secret?: string; // Encrypted
}

