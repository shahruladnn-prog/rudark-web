export type PaymentGateway = 'chip' | 'manual';

export interface ChipSettings {
    enabled: boolean;
    environment: 'test' | 'live';
    brand_id: string;
    public_key?: string; // For webhook signature verification
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
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
    enabled_gateway: 'chip', // CHIP as primary gateway
    chip: {
        enabled: true,
        environment: 'test', // Start in test mode for safety
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
    }
};
