export interface VariantOption {
    name: string; // e.g. "Size", "Color"
    values: string[]; // e.g. ["S", "M", "L"], ["Red", "Blue"]
}

export interface ProductVariant {
    id: string; // Unique ID (e.g. generated UUID or hash)
    sku: string; // Unique SKU for this specific variation
    price: number; // Override base price
    promo_price?: number; // Optional promo price
    stock_status: 'IN_STOCK' | 'LOW' | 'OUT' | 'ARCHIVED' | 'CONTACT_US';
    options: Record<string, string>; // { "Size": "S", "Color": "Red" }
    image?: string; // Optional specific image
}

export interface Product {
    id?: string;
    sku: string; // Base SKU (or link to Loyverse Parent)
    name: string;
    description: string;
    web_price: number; // Base price (used if no variant selected or as default)
    promo_price?: number;
    images: string[];
    category_slug: string;
    subcategory_slug?: string;
    subcategory_slugs?: string[];
    stock_status: 'IN_STOCK' | 'LOW' | 'OUT' | 'ARCHIVED' | 'CONTACT_US';
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
