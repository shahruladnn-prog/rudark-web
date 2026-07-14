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

export interface VariantSpecLine {
    label: string;
    value: string;
}

export interface ProductVariant {
    id: string; // Unique ID (e.g. generated UUID or hash)
    sku: string; // Unique SKU for this specific variation
    price: number; // Override base price
    promo_price?: number; // Optional promo price
    stock_status: 'IN_STOCK' | 'LOW' | 'OUT' | 'ARCHIVED' | 'CONTACT_US';
    options: Record<string, string>; // { "Size": "S", "Color": "Red" }
    image?: string; // Optional specific image
    spec?: VariantSpecLine[]; // Optional technical spec block (freeform label/value pairs), shown when this variant is selected
    stock_quantity?: number;
    reserved_quantity?: number;
    loyverse_variant_id?: string; // Kept for one-time catalog import mapping only
    // Phase 4 fields
    cost_lots?: CostLot[];
    stock_web?: number;
    stock_shopee?: number;
    stock_lazada?: number;
    stock_tiktok?: number;
}

export type PurchaseMode = 'online' | 'inquire' | 'display';
export type PriceDisplay = 'fixed' | 'from' | 'quote' | 'hidden';
export type CatalogUseCase = 'retail' | 'events' | 'corporate';

export interface Product {
    id?: string;
    sku: string;
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

    stock_quantity?: number;        // Total on-hand stock
    reserved_quantity?: number;     // Currently reserved in active checkouts
    last_stock_sync?: any;         // Timestamp of last stock update
    reorder_point?: number;        // Threshold for low stock warning
    safety_stock?: number;         // Buffer stock level

    // Pre-order (deposit now, balance later)
    is_pre_order?: boolean;
    pre_order_deposit_percent?: number; // e.g. 30 = 30% deposit
    pre_order_eta?: string;             // freeform, e.g. "September 2026"

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

    // Reviews (denormalized for card display)
    average_rating?: number;
    review_count?: number;

    // Multi-channel stock allocations (manual, for auditing — not auto-synced)
    store_allocations?: { store_name: string; qty: number }[];

    // Catalog display (B2B / showcase)
    show_in_catalog?: boolean;
    catalog_featured?: boolean;
    purchase_mode?: PurchaseMode;
    price_display?: PriceDisplay;
    catalog_tags?: string[];
    use_cases?: CatalogUseCase[];
    moq?: number;
    lead_time_days?: number;
    customizable?: boolean;
    catalog_sort?: number;
    catalog_locked?: boolean;
}

/** Non-inventory catalog items (services, capabilities) */
export interface CatalogEntry {
    id?: string;
    slug: string;
    title: string;
    description: string;
    images: string[];
    image_thumbnails?: string[];
    purchase_mode: PurchaseMode;
    price_display: PriceDisplay;
    web_price?: number;
    catalog_tags?: string[];
    use_cases?: CatalogUseCase[];
    moq?: number;
    lead_time_days?: number;
    customizable?: boolean;
    catalog_featured?: boolean;
    catalog_sort?: number;
    is_active?: boolean;
    created_at?: any;
    updated_at?: any;
}

/** Unified shape for catalog UI (products + entries) */
export type CatalogItemSource = 'product' | 'entry';

export interface CatalogItem {
    id: string;
    source: CatalogItemSource;
    sku: string;
    name: string;
    description: string;
    images: string[];
    image_thumbnails?: string[];
    category_slug?: string;
    web_price?: number;
    promo_price?: number;
    purchase_mode: PurchaseMode;
    price_display: PriceDisplay;
    catalog_tags?: string[];
    use_cases?: CatalogUseCase[];
    moq?: number;
    lead_time_days?: number;
    customizable?: boolean;
    catalog_featured?: boolean;
    catalog_sort?: number;
    stock_status?: Product['stock_status'];
    is_public?: boolean;
    options?: VariantOption[];
    variants?: ProductVariant[];
    product_id?: string;
}

export interface CatalogInquiryLine {
    sku: string;
    name: string;
    image?: string;
    source: CatalogItemSource;
    note?: string;
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

