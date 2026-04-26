'use client';

import { useState, useEffect } from 'react';
import { getShippingSettings, updateShippingSettings } from '@/actions/shipping-settings-actions';
import { ShippingSettings } from '@/types/shipping-settings';
import CategorySelector from '@/components/admin/category-selector';
import { useToast } from '@/components/ui/toast';
import { Truck } from 'lucide-react';

export default function ShippingSettingsPage() {
    const { showToast } = useToast();
    const [settings, setSettings] = useState<ShippingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        const data = await getShippingSettings();
        setSettings(data);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setSaving(true);
        const result = await updateShippingSettings(settings);
        if (result.success) showToast('success', 'Shipping settings saved');
        else showToast('error', result.error || 'Failed to save settings');
        setSaving(false);
    };

    if (loading) return <div className="p-8 text-gray-400 text-sm">Loading settings…</div>;
    if (!settings) return <div className="p-8 text-red-500 text-sm">Failed to load settings</div>;

    return (
        <div className="max-w-2xl pb-20">
            <h1 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Truck size={20} className="text-blue-600" /> Shipping Settings
            </h1>
            <p className="text-sm text-gray-400 mb-6">Configure free shipping thresholds</p>

            <form onSubmit={handleSave} className="space-y-4">
                {/* Free shipping toggle */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={settings.free_shipping_enabled}
                            onChange={e => setSettings({ ...settings, free_shipping_enabled: e.target.checked })}
                            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        <div>
                            <div className="text-sm font-medium text-gray-900">Enable Free Shipping</div>
                            <div className="text-xs text-gray-400 mt-0.5">Orders above the threshold will qualify for free shipping</div>
                        </div>
                    </label>
                </div>

                {/* Threshold */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Minimum Order Value for Free Shipping
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">RM</span>
                        <input type="number" step="0.01" min="0"
                            value={settings.free_shipping_threshold}
                            onChange={e => setSettings({ ...settings, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                            disabled={!settings.free_shipping_enabled}
                            className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Recommended: ~30% above your average order value</p>
                </div>

                {/* Applies to */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Applies To</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="applies_to" value="all"
                                checked={settings.free_shipping_applies_to === 'all'}
                                onChange={() => setSettings({ ...settings, free_shipping_applies_to: 'all' })}
                                disabled={!settings.free_shipping_enabled}
                                className="text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-gray-700">All shipping methods</span>
                        </label>
                        <label className="flex items-center gap-2 opacity-40 cursor-not-allowed">
                            <input type="radio" disabled className="text-blue-600" />
                            <span className="text-sm text-gray-500">Standard shipping only (coming soon)</span>
                        </label>
                    </div>
                </div>

                {/* Qualifying categories */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Qualifying Categories
                    </label>
                    <p className="text-xs text-gray-400 mb-3">
                        Leave empty to apply to all categories. All items in cart must be from selected categories.
                    </p>
                    <CategorySelector
                        selectedCategories={settings.free_shipping_categories || []}
                        onChange={cats => setSettings({ ...settings, free_shipping_categories: cats })}
                        disabled={!settings.free_shipping_enabled}
                    />
                </div>

                {/* Preview */}
                {settings.free_shipping_enabled && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-700 font-medium text-center">
                        🚚 FREE SHIPPING on orders over RM {settings.free_shipping_threshold.toFixed(2)}!
                    </div>
                )}

                <div className="flex justify-end">
                    <button type="submit" disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                        {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
