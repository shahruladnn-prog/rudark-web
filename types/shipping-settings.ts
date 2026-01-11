// Shipping Settings Type Definition
export interface ShippingSettings {
    free_shipping_enabled: boolean;
    free_shipping_threshold: number;
    free_shipping_applies_to: 'all' | 'specific';
    free_shipping_regions?: string[];
    free_shipping_categories?: string[]; // Category slugs that qualify for free shipping
}

// Default shipping settings
export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
    free_shipping_enabled: false,
    free_shipping_threshold: 100,
    free_shipping_applies_to: 'all',
    free_shipping_regions: [],
    free_shipping_categories: [] // Empty = applies to all categories
};
