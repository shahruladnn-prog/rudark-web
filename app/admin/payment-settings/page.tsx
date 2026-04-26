'use client';

import { useState, useEffect } from 'react';
import { getPaymentSettings, updatePaymentSettings, syncLoyversePaymentTypes } from '@/actions/payment-settings-actions';
import { PaymentSettings, PaymentGateway } from '@/types/payment-settings';
import { useToast } from '@/components/ui/toast';
import { CheckCircle, Shield, RefreshCw, CreditCard } from 'lucide-react';

export default function PaymentSettingsPage() {
    const { showToast } = useToast();
    const [settings, setSettings] = useState<PaymentSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => { loadSettings(); }, []);

    async function loadSettings() {
        const data = await getPaymentSettings();
        setSettings(data);
        setLoading(false);
    }

    async function handleSyncLoyverse() {
        setSyncing(true);
        const result = await syncLoyversePaymentTypes();
        if (result.success) {
            showToast('success', `Fetched ${result.count} payment types from Loyverse`);
            await loadSettings(); // Refresh UI with new keys
        } else {
            showToast('error', result.error || 'Failed to sync payment types');
        }
        setSyncing(false);
    }

    async function handleSave() {
        if (!settings) return;
        setSaving(true);
        const result = await updatePaymentSettings(settings);
        if (result.success) {
            showToast('success', 'Payment settings saved');
        } else {
            showToast('error', result.error || 'Failed to save settings');
        }
        setSaving(false);
    }

    if (loading) return <div className="p-8 text-gray-400">Loading settings...</div>;
    if (!settings) return <div className="p-8 text-red-500">Failed to load settings</div>;

    return (
        <div className="max-w-3xl pb-20">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Payment Settings</h1>
            <p className="text-gray-400 text-sm mb-6">Configure payment gateways</p>

            {/* Active gateway */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Gateway</h2>
                <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${settings.enabled_gateway === 'chip' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="gateway" value="chip" checked={settings.enabled_gateway === 'chip'}
                            onChange={() => setSettings({ ...settings, enabled_gateway: 'chip' as PaymentGateway })} />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">CHIP Payment Gateway</div>
                            <div className="text-xs text-gray-400">FPX, Cards, GrabPay, TNG, Boost</div>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                            <Shield size={11} /> Live Mode
                        </span>
                    </label>

                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${settings.enabled_gateway === 'manual' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="gateway" value="manual" checked={settings.enabled_gateway === 'manual'}
                            onChange={() => setSettings({ ...settings, enabled_gateway: 'manual' as PaymentGateway })} />
                        <div>
                            <div className="text-sm font-medium text-gray-900">Manual Payment</div>
                            <div className="text-xs text-gray-400">Bank Transfer, Cash on Collection</div>
                        </div>
                    </label>
                </div>
            </div>

            {/* CHIP info */}
            {settings.enabled_gateway === 'chip' && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">CHIP Configuration</h2>
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg mb-4">
                        <CheckCircle size={15} className="text-green-600" />
                        <span className="text-sm text-green-700 font-medium">Running in Live Mode — real charges are processed</span>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Brand ID</label>
                        <input type="text" value={settings.chip.brand_id} readOnly
                            className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-500 font-mono text-sm cursor-not-allowed" />
                        <p className="text-xs text-gray-400 mt-1">Set via environment variable CHIP_LIVE_SECRET_KEY</p>
                    </div>
                </div>
            )}

            {/* Manual payment config */}
            {settings.enabled_gateway === 'manual' && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Manual Payment Configuration</h2>
                    <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <input type="checkbox" checked={settings.manual_payment.require_admin_approval}
                            onChange={(e) => setSettings({ ...settings, manual_payment: { ...settings.manual_payment, require_admin_approval: e.target.checked } })}
                            className="rounded" />
                        <span className="text-sm text-gray-700">Require admin approval before order is confirmed</span>
                    </label>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Instructions</label>
                        <textarea
                            value={settings.manual_payment.payment_instructions}
                            onChange={(e) => setSettings({ ...settings, manual_payment: { ...settings.manual_payment, payment_instructions: e.target.value } })}
                            rows={8}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:border-blue-400"
                            placeholder="Enter payment instructions shown to customers..."
                        />
                        <p className="text-xs text-gray-400 mt-1">Use [ORDER_ID] as a placeholder for the order number</p>
                    </div>
                </div>
            )}

            {/* Loyverse Mapping */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700">Loyverse Payment Mapping</h2>
                        <p className="text-xs text-gray-400">Map POS payment IDs to readable labels for reports</p>
                    </div>
                    <button 
                        type="button"
                        onClick={handleSyncLoyverse}
                        disabled={syncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                        Sync from Loyverse
                    </button>
                </div>

                {!settings.loyverse_mappings || Object.keys(settings.loyverse_mappings).length === 0 ? (
                    <div className="py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                        <CreditCard size={24} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-xs text-gray-500">No payment mappings yet. Click sync to fetch them.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {Object.entries(settings.loyverse_mappings).map(([id, label]) => (
                            <div key={id} className="flex gap-4 items-center">
                                <div className="flex-1">
                                    <div className="text-[10px] text-gray-400 font-mono truncate max-w-[200px] mb-1">{id}</div>
                                    <input 
                                        type="text" 
                                        value={label}
                                        onChange={(e) => {
                                            const newMappings = { ...settings.loyverse_mappings, [id]: e.target.value };
                                            setSettings({ ...settings, loyverse_mappings: newMappings });
                                        }}
                                        className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-sm focus:border-blue-400 outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                    {saving ? 'Saving…' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}
