'use client';

import { useState, useEffect } from 'react';
import { getShippingSettings, updateShippingSettings } from '@/actions/shipping-settings-actions';
import { ShippingSettings } from '@/types/shipping-settings';
import CategorySelector from '@/components/admin/category-selector';

export default function ShippingSettingsPage() {
    const [settings, setSettings] = useState<ShippingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await getShippingSettings();
        setSettings(data);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        setSaving(true);
        setMessage('');

        const result = await updateShippingSettings(settings);

        if (result.success) {
            setMessage('✅ Settings saved successfully!');
        } else {
            setMessage(`❌ Error: ${result.error}`);
        }

        setSaving(false);
        setTimeout(() => setMessage(''), 3000);
    };

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    if (!settings) {
        return <div className="p-8">Error loading settings</div>;
    }

    return (
        <div className="min-h-screen bg-rudark-matte text-white p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-condensed font-bold mb-8">Shipping Settings</h1>

                <form onSubmit={handleSave} className="bg-rudark-charcoal p-6 rounded-lg space-y-6">
                    {/* Enable/Disable Free Shipping */}
                    <div>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.free_shipping_enabled}
                                onChange={(e) => setSettings({ ...settings, free_shipping_enabled: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-600 bg-rudark-matte text-rudark-volt focus:ring-rudark-volt"
                            />
                            <span className="text-lg">Enable Free Shipping</span>
                        </label>
                        <p className="text-sm text-gray-400 mt-2 ml-8">
                            When enabled, orders above the threshold will get free shipping
                        </p>
                    </div>

                    {/* Threshold Amount */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Minimum Order Value for Free Shipping
                        </label>
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-400">RM</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={settings.free_shipping_threshold}
                                onChange={(e) => setSettings({ ...settings, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                                className="flex-1 bg-rudark-matte border border-gray-600 rounded px-4 py-2 text-white focus:ring-2 focus:ring-rudark-volt focus:border-transparent"
                                disabled={!settings.free_shipping_enabled}
                            />
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                            Recommended: Set to 30% above your Average Order Value
                        </p>
                    </div>

                    {/* Applies To */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Applies To
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="applies_to"
                                    value="all"
                                    checked={settings.free_shipping_applies_to === 'all'}
                                    onChange={(e) => setSettings({ ...settings, free_shipping_applies_to: 'all' })}
                                    className="text-rudark-volt focus:ring-rudark-volt"
                                    disabled={!settings.free_shipping_enabled}
                                />
                                <span>All shipping methods</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer opacity-50">
                                <input
                                    type="radio"
                                    name="applies_to"
                                    value="standard"
                                    disabled
                                    className="text-rudark-volt focus:ring-rudark-volt"
                                />
                                <span>Standard shipping only (Coming soon)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer opacity-50">
                                <input
                                    type="radio"
                                    name="applies_to"
                                    value="regions"
                                    disabled
                                    className="text-rudark-volt focus:ring-rudark-volt"
                                />
                                <span>Specific regions only (Coming soon)</span>
                            </label>
                        </div>
                    </div>

                    {/* Qualifying Categories */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Qualifying Categories
                        </label>
                        <p className="text-sm text-gray-400 mb-3">
                            Select categories that qualify for free shipping. Leave empty to apply to all categories.
                            <br />
                            <strong className="text-rudark-volt">Important:</strong> ALL items in cart must be from selected categories to qualify.
                        </p>
                        <CategorySelector
                            selectedCategories={settings.free_shipping_categories || []}
                            onChange={(categories) => setSettings({ ...settings, free_shipping_categories: categories })}
                            disabled={!settings.free_shipping_enabled}
                        />
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                        <div>
                            {message && (
                                <span className={message.startsWith('✅') ? 'text-green-400' : 'text-red-400'}>
                                    {message}
                                </span>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-rudark-volt text-black px-6 py-2 rounded font-condensed font-bold uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>

                {/* Preview */}
                {settings.free_shipping_enabled && (
                    <div className="mt-6 bg-rudark-charcoal p-6 rounded-lg">
                        <h2 className="text-xl font-condensed font-bold mb-4">Preview</h2>
                        <div className="bg-rudark-volt text-black p-4 rounded text-center font-condensed">
                            🚚 FREE SHIPPING on orders over RM {settings.free_shipping_threshold.toFixed(2)}!
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
