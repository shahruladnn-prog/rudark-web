export interface PromoCode {
    code: string; // e.g. "RUDARK10"
    type: 'PERCENTAGE' | 'FIXED';
    value: number; // e.g. 10 (for 10%) or 50 (for RM50 off)
    min_spend: number;
    active: boolean;
    usage_limit?: number;
    usage_count: number;
}
