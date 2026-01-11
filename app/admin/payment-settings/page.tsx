'use client';

import { useState, useEffect } from 'react';
import { getPaymentSettings, updatePaymentSettings, toggleChipEnvironment } from '@/actions/payment-settings-actions';
import { PaymentSettings, PaymentGateway } from '@/types/payment-settings';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function PaymentSettingsPage() {
    const [settings, setSettings] = useState<PaymentSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        const data = await getPaymentSettings();
        setSettings(data);
        setLoading(false);
    }

    async function handleSave() {
        if (!settings) return;

        setSaving(true);
        setMessage(null);

        const result = await updatePaymentSettings(settings);

        if (result.success) {
            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to save settings' });
        }

        setSaving(false);
    }

    async function handleGatewayChange(gateway: PaymentGateway) {
        if (!settings) return;
        setSettings({ ...settings, enabled_gateway: gateway });
    }

    async function handleChipEnvironmentToggle(env: 'test' | 'live') {
        if (!settings) return;
        setSettings({
            ...settings,
            chip: { ...settings.chip, environment: env }
        });
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-gray-400">Loading settings...</div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="p-8">
                <div className="text-red-400">Failed to load settings</div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="max-w-4xl">
                <h1 className="text-3xl font-condensed font-bold mb-2 uppercase">Payment Gateway Settings</h1>
                <p className="text-gray-400 mb-8">Configure payment gateways and processing options</p>

                {message && (
                    <div className={`mb-6 p-4 rounded-sm border flex items-center gap-2 ${message.type === 'success'
                            ? 'bg-green-900/20 border-green-500 text-green-200'
                            : 'bg-red-900/20 border-red-500 text-red-200'
                        }`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        {message.text}
                    </div>
                )}

                {/* Active Gateway Selector */}
                <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey mb-6">
                    <h2 className="text-xl font-bold mb-4">Active Payment Gateway</h2>
                    <p className="text-gray-400 text-sm mb-4">Select which payment gateway to use for all transactions</p>

                    <div className="space-y-3">
                        {/* CHIP */}
                        <label className={`flex items-center gap-4 p-4 border rounded-sm cursor-pointer transition-all ${settings.enabled_gateway === 'chip'
                                ? 'border-rudark-volt bg-rudark-volt/10'
                                : 'border-rudark-grey hover:border-gray-500'
                            }`}>
                            <input
                                type="radio"
                                name="gateway"
                                value="chip"
                                checked={settings.enabled_gateway === 'chip'}
                                onChange={() => handleGatewayChange('chip')}
                                className="w-4 h-4"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-white">CHIP Payment Gateway</div>
                                <div className="text-sm text-gray-400">FPX, Cards, E-wallets (GrabPay, TNG, Boost)</div>
                            </div>
                            {settings.enabled_gateway === 'chip' && settings.chip.environment === 'test' && (
                                <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">TEST MODE</span>
                            )}
                            {settings.enabled_gateway === 'chip' && settings.chip.environment === 'live' && (
                                <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">LIVE MODE</span>
                            )}
                        </label>

                        {/* BizAppay */}
                        <label className={`flex items-center gap-4 p-4 border rounded-sm cursor-pointer transition-all ${settings.enabled_gateway === 'bizappay'
                                ? 'border-rudark-volt bg-rudark-volt/10'
                                : 'border-rudark-grey hover:border-gray-500'
                            }`}>
                            <input
                                type="radio"
                                name="gateway"
                                value="bizappay"
                                checked={settings.enabled_gateway === 'bizappay'}
                                onChange={() => handleGatewayChange('bizappay')}
                                className="w-4 h-4"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-white">BizAppay</div>
                                <div className="text-sm text-gray-400">FPX Online Banking</div>
                            </div>
                            {settings.enabled_gateway === 'bizappay' && (
                                <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">LIVE ONLY</span>
                            )}
                        </label>

                        {/* Manual Payment */}
                        <label className={`flex items-center gap-4 p-4 border rounded-sm cursor-pointer transition-all ${settings.enabled_gateway === 'manual'
                                ? 'border-rudark-volt bg-rudark-volt/10'
                                : 'border-rudark-grey hover:border-gray-500'
                            }`}>
                            <input
                                type="radio"
                                name="gateway"
                                value="manual"
                                checked={settings.enabled_gateway === 'manual'}
                                onChange={() => handleGatewayChange('manual')}
                                className="w-4 h-4"
                            />
                            <div className="flex-1">
                                <div className="font-bold text-white">Manual Payment</div>
                                <div className="text-sm text-gray-400">Bank Transfer, Cash on Collection</div>
                            </div>
                        </label>
                    </div>
                </div>

                {/* CHIP Configuration */}
                {settings.enabled_gateway === 'chip' && (
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey mb-6">
                        <h2 className="text-xl font-bold mb-4">CHIP Configuration</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-mono text-rudark-volt mb-2 uppercase">Environment</label>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleChipEnvironmentToggle('test')}
                                    className={`flex-1 p-3 rounded-sm border font-bold transition-all ${settings.chip.environment === 'test'
                                            ? 'bg-yellow-500 text-black border-yellow-500'
                                            : 'bg-rudark-matte border-rudark-grey text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    🧪 Test Mode
                                </button>
                                <button
                                    onClick={() => handleChipEnvironmentToggle('live')}
                                    className={`flex-1 p-3 rounded-sm border font-bold transition-all ${settings.chip.environment === 'live'
                                            ? 'bg-green-500 text-white border-green-500'
                                            : 'bg-rudark-matte border-rudark-grey text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    ✅ Live Mode
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {settings.chip.environment === 'test'
                                    ? '⚠️ Test mode - No real charges. Use test cards: 4444 3333 2222 1111'
                                    : '✅ Live mode - Real charges will be processed'}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-mono text-rudark-volt mb-2 uppercase">Brand ID</label>
                            <input
                                type="text"
                                value={settings.chip.brand_id}
                                readOnly
                                className="w-full bg-rudark-charcoal border border-rudark-grey rounded-sm p-3 text-gray-400 cursor-not-allowed font-mono text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">Configured in environment variables</p>
                        </div>
                    </div>
                )}

                {/* Manual Payment Configuration */}
                {settings.enabled_gateway === 'manual' && (
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey mb-6">
                        <h2 className="text-xl font-bold mb-4">Manual Payment Configuration</h2>

                        <div className="mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.manual_payment.require_admin_approval}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        manual_payment: { ...settings.manual_payment, require_admin_approval: e.target.checked }
                                    })}
                                    className="w-4 h-4"
                                />
                                <span className="text-white">Require admin approval for manual payments</span>
                            </label>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-mono text-rudark-volt mb-2 uppercase">Payment Instructions</label>
                            <textarea
                                value={settings.manual_payment.payment_instructions}
                                onChange={(e) => setSettings({
                                    ...settings,
                                    manual_payment: { ...settings.manual_payment, payment_instructions: e.target.value }
                                })}
                                rows={8}
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white font-mono text-sm focus:border-rudark-volt focus:outline-none"
                                placeholder="Enter payment instructions..."
                            />
                            <p className="text-xs text-gray-500 mt-1">Use [ORDER_ID] as placeholder for order ID</p>
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-rudark-volt text-black font-bold rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
