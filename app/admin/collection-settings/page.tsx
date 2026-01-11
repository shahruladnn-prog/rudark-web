'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    getCollectionSettings,
    updateCollectionSettings,
    addCollectionPoint,
    updateCollectionPoint,
    deleteCollectionPoint
} from '@/actions/collection-settings-actions';
import { CollectionSettings, CollectionPoint } from '@/types/collection-settings';
import { MapPin, Plus, Edit, Trash2, Save, X } from 'lucide-react';

export default function CollectionSettingsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState<CollectionSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingPoint, setEditingPoint] = useState<CollectionPoint | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        setLoading(true);
        const data = await getCollectionSettings();
        setSettings(data);
        setLoading(false);
    }

    async function handleSaveSettings() {
        if (!settings) return;

        setSaving(true);
        const result = await updateCollectionSettings(settings);
        setSaving(false);

        if (result.success) {
            alert('Settings saved successfully!');
        } else {
            alert('Failed to save settings: ' + result.error);
        }
    }

    async function handleAddPoint(point: Omit<CollectionPoint, 'id' | 'created_at' | 'updated_at'>) {
        const result = await addCollectionPoint(point);

        if (result.success) {
            await loadSettings();
            setShowAddForm(false);
            alert('Collection point added!');
        } else {
            alert('Failed to add point: ' + result.error);
        }
    }

    async function handleUpdatePoint(id: string, updates: Partial<CollectionPoint>) {
        const result = await updateCollectionPoint(id, updates);

        if (result.success) {
            await loadSettings();
            setEditingPoint(null);
            alert('Collection point updated!');
        } else {
            alert('Failed to update point: ' + result.error);
        }
    }

    async function handleDeletePoint(id: string) {
        if (!confirm('Delete this collection point?')) return;

        const result = await deleteCollectionPoint(id);

        if (result.success) {
            await loadSettings();
            alert('Collection point deleted!');
        } else {
            alert('Failed to delete point: ' + result.error);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-rudark-matte text-white p-8 flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="min-h-screen bg-rudark-matte text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-condensed font-bold uppercase mb-2">
                            Collection Settings
                        </h1>
                        <p className="text-gray-400">
                            Manage self-collection points and settings
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="px-4 py-2 border border-gray-600 hover:border-white transition-colors"
                    >
                        Back to Admin
                    </button>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="bg-rudark-carbon border border-rudark-grey/30 p-6 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.enabled}
                            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                            className="w-5 h-5"
                        />
                        <div>
                            <div className="font-bold text-lg">Enable Self-Collection</div>
                            <div className="text-sm text-gray-400">
                                Allow customers to pick up orders at collection points
                            </div>
                        </div>
                    </label>
                </div>

                {/* Collection Points List */}
                <div className="bg-rudark-carbon border border-rudark-grey/30 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-condensed font-bold uppercase">
                            Collection Points ({settings.collection_points.length})
                        </h2>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-rudark-volt text-black font-bold hover:bg-white transition-colors"
                        >
                            <Plus size={20} />
                            Add Point
                        </button>
                    </div>

                    {settings.collection_points.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <MapPin size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No collection points yet. Add your first one!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {settings.collection_points.map((point) => (
                                <CollectionPointCard
                                    key={point.id}
                                    point={point}
                                    isEditing={editingPoint?.id === point.id}
                                    onEdit={() => setEditingPoint(point)}
                                    onSave={(updates) => handleUpdatePoint(point.id, updates)}
                                    onCancel={() => setEditingPoint(null)}
                                    onDelete={() => handleDeletePoint(point.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Point Form */}
                {showAddForm && (
                    <CollectionPointForm
                        onSave={handleAddPoint}
                        onCancel={() => setShowAddForm(false)}
                    />
                )}

                {/* Save Button */}
                <div className="flex justify-end gap-4">
                    <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-rudark-volt text-black font-bold hover:bg-white transition-colors disabled:opacity-50"
                    >
                        <Save size={20} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Collection Point Card Component
function CollectionPointCard({
    point,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete
}: {
    point: CollectionPoint;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (updates: Partial<CollectionPoint>) => void;
    onCancel: () => void;
    onDelete: () => void;
}) {
    const [formData, setFormData] = useState(point);

    if (isEditing) {
        return (
            <div className="border border-rudark-volt p-4 bg-rudark-matte/50">
                <CollectionPointForm
                    initialData={formData}
                    onSave={(data) => onSave(data)}
                    onCancel={onCancel}
                    isEdit
                />
            </div>
        );
    }

    return (
        <div className={`border p-4 ${point.is_active ? 'border-gray-600' : 'border-gray-800 opacity-50'}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{point.name}</h3>
                        {!point.is_active && (
                            <span className="px-2 py-1 text-xs bg-gray-700 text-gray-400">INACTIVE</span>
                        )}
                    </div>
                    <p className="text-gray-400 mb-2">{point.address}</p>
                    <p className="text-sm text-gray-500">{point.postcode}, {point.state}</p>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Fee:</span>
                            <span className="ml-2 text-rudark-volt font-bold">RM {point.collection_fee.toFixed(2)}</span>
                        </div>
                        {point.operating_hours && (
                            <div>
                                <span className="text-gray-500">Hours:</span>
                                <span className="ml-2 text-white">{point.operating_hours}</span>
                            </div>
                        )}
                        {point.contact_phone && (
                            <div>
                                <span className="text-gray-500">Phone:</span>
                                <span className="ml-2 text-white">{point.contact_phone}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 border border-gray-600 hover:border-rudark-volt transition-colors"
                        title="Edit"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 border border-gray-600 hover:border-red-500 hover:text-red-500 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Collection Point Form Component
function CollectionPointForm({
    initialData,
    onSave,
    onCancel,
    isEdit = false
}: {
    initialData?: Partial<CollectionPoint>;
    onSave: (data: any) => void;
    onCancel: () => void;
    isEdit?: boolean;
}) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        address: initialData?.address || '',
        postcode: initialData?.postcode || '',
        state: initialData?.state || '',
        collection_fee: initialData?.collection_fee || 0,
        operating_hours: initialData?.operating_hours || '',
        contact_phone: initialData?.contact_phone || '',
        contact_email: initialData?.contact_email || '',
        is_active: initialData?.is_active ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-rudark-carbon border border-rudark-grey/30 p-6">
            <h3 className="text-xl font-bold mb-4">{isEdit ? 'Edit' : 'Add'} Collection Point</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm mb-2">Name *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-2 bg-rudark-matte border border-gray-600 text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm mb-2">Collection Fee (RM) *</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.collection_fee}
                        onChange={(e) => setFormData({ ...formData, collection_fee: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-rudark-matte border border-gray-600 text-white"
                        required
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm mb-2">Address *</label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full p-2 bg-rudark-matte border border-gray-600 text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm mb-2">Postcode *</label>
                    <input
                        type="text"
                        value={formData.postcode}
                        onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                        className="w-full p-2 bg-rudark-matte border border-gray-600 text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm mb-2">State *</label>
                    <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full p-2 bg-rudark-matte border border-gray-600 text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm mb-2">Operating Hours</label>
                    <input
                        type="text"
                        value={formData.operating_hours}
                        onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                        placeholder="e.g., Mon-Fri 9AM-6PM"
                        className="w-full p-2 bg-rudark-matte border border-gray-600 text-white"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-2">Contact Phone</label>
                    <input
                        type="text"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="+60123456789"
                        className="w-full p-2 bg-rudark-matte border border-gray-600 text-white"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <span>Active (visible to customers)</span>
                    </label>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-rudark-volt text-black font-bold hover:bg-white"
                >
                    <Save size={18} />
                    {isEdit ? 'Update' : 'Add'} Point
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-600 hover:border-white"
                >
                    <X size={18} />
                    Cancel
                </button>
            </div>
        </form>
    );
}
