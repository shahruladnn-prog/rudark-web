// Collection Settings Type Definition

export interface CollectionPoint {
    id: string;
    name: string;
    address: string;
    postcode: string;
    state: string;
    collection_fee: number;
    operating_hours?: string;
    contact_phone?: string;
    contact_email?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CollectionSettings {
    enabled: boolean;
    collection_points: CollectionPoint[];
}

export const DEFAULT_COLLECTION_SETTINGS: CollectionSettings = {
    enabled: false,
    collection_points: []
};
