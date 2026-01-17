/**
 * Store entity for multi-location Loyverse integration
 */
export interface Store {
    id: string;
    name: string;

    // Loyverse Integration
    loyverse_store_id: string;
    loyverse_payment_type_id?: string;

    // Display Info
    address?: string;
    phone?: string;
    email?: string;

    // Settings
    is_default: boolean;      // Used for web orders
    is_active: boolean;       // Can receive orders

    // Timestamps
    created_at?: string;
    updated_at?: string;
}

export const DEFAULT_STORE: Partial<Store> = {
    name: '',
    loyverse_store_id: '',
    loyverse_payment_type_id: '',
    address: '',
    is_default: false,
    is_active: true,
};
