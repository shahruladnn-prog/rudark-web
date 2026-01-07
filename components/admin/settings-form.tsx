'use client';

import { useState } from 'react';
import { StoreSettings } from '@/types';
import { saveSettings } from '@/actions/settings-actions';
import { Save, Building, Megaphone, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsForm({ initialData }: { initialData: StoreSettings }) {
    const [formData, setFormData] = useState<StoreSettings>(initialData);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const updateField = (field: keyof StoreSettings, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await saveSettings(formData);

        if (result.success) {
            alert("Settings saved successfully!");
            router.refresh(); // Refresh to catch revalidation
        } else {
            alert("Error saving settings.");
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSave} className="max-w-4xl mx-auto pb-20 space-y-8">

            {/* Header */}
            <div className="flex justify-between items-end border-b border-rudark-grey pb-6">
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Store <span className="text-rudark-volt">Settings</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        Configure general application preferences.
                    </p>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-rudark-volt text-black px-8 py-3 rounded-sm font-condensed uppercase font-bold tracking-wide hover:bg-white transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-8">

                {/* General Info */}
                <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-6">
                    <div className="flex items-center gap-3 text-rudark-volt mb-2">
                        <Building size={20} />
                        <h3 className="font-condensed font-bold uppercase tracking-wide text-lg">General Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-mono uppercase">Store Name</label>
                            <input
                                type="text"
                                value={formData.storeName}
                                onChange={(e) => updateField('storeName', e.target.value)}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-mono uppercase">Support Email</label>
                            <input
                                type="email"
                                value={formData.supportEmail}
                                onChange={(e) => updateField('supportEmail', e.target.value)}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs text-gray-400 font-mono uppercase">Business Address</label>
                            <textarea
                                value={formData.businessAddress}
                                onChange={(e) => updateField('businessAddress', e.target.value)}
                                rows={2}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Announcement Bar */}
                <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-6">
                    <div className="flex items-center gap-3 text-rudark-volt mb-2">
                        <Megaphone size={20} />
                        <h3 className="font-condensed font-bold uppercase tracking-wide text-lg">Announcement Bar</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="announce-enabled"
                                checked={formData.announcementEnabled}
                                onChange={(e) => updateField('announcementEnabled', e.target.checked)}
                                className="w-5 h-5 accent-rudark-volt bg-rudark-matte border-rudark-grey rounded-sm"
                            />
                            <label htmlFor="announce-enabled" className="text-sm font-bold uppercase text-white cursor-pointer select-none">
                                Enable Announcement Bar
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-mono uppercase">Message Text</label>
                            <input
                                type="text"
                                value={formData.announcementText}
                                onChange={(e) => updateField('announcementText', e.target.value)}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none"
                                placeholder="e.g. Free shipping on all orders!"
                            />
                        </div>
                    </div>
                </div>
            </div>

        </form>
    );
}
