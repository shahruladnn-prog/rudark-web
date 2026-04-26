export type PaymentGateway = 'chip' | 'manual';

export interface ChipSettings {
    enabled: boolean;
    brand_id: string;
    public_key?: string;
}

export interface ManualPaymentSettings {
    enabled: boolean;
    require_admin_approval: boolean;
    payment_instructions: string;
    allowed_payment_methods: string[];
}

export interface PaymentSettings {
    enabled_gateway: PaymentGateway;
    chip: ChipSettings;
    manual_payment: ManualPaymentSettings;
    loyverse_mappings?: Record<string, string>; // Maps Loyverse payment_type_id to label
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
    enabled_gateway: 'chip',
    chip: {
        enabled: true,
        brand_id: '91941783-06d8-4ee6-9a72-46b7880b8f2e'
    },
    manual_payment: {
        enabled: true,
        require_admin_approval: true,
        payment_instructions: `Please transfer payment to:

Bank: Maybank
Account Name: Your Company Name
Account Number: XXXX-XXXX-XXXX

After payment, please email proof to: orders@rudark.my

Reference: [ORDER_ID]`,
        allowed_payment_methods: ['Bank Transfer', 'Cash on Collection']
    },
    loyverse_mappings: {}
};
