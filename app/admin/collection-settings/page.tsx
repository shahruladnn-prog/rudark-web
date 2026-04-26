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
import { useToast } from '@/components/ui/toast';

export default function CollectionSettingsPage() {
    const router = useRouter();
    const { showToast } = useToast();
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
            showToast('success', 'Settings saved successfully!');
        } else {
            showToast('error', 'Failed to save settings: ' + result.error);
        }
    }

    async function handleAddPoint(point: Omit<CollectionPoint, 'id' | 'created_at' | 'updated_at'>) {
        const result = await addCollectionPoint(point);

        if (result.success) {
            await loadSettings();
            setShowAddForm(false);
            showToast('success', 'Collection point added!');
        } else {
            showToast('error', 'Failed to add point: ' + result.error);
        }
    }

    async function handleUpdatePoint(id: string, updates: Partial<CollectionPoint>) {
        const result = await updateCollectionPoint(id, updates);

        if (result.success) {
            await loadSettings();
            setEditingPoint(null);
            showToast('success', 'Collection point updated!');
        } else {
            showToast('error', 'Failed to update point: ' + result.error);
        }
    }

    async function handleDeletePoint(id: string) {
        if (!confirm('Delete this collection point?')) return;

        const result = await deleteCollectionPoint(id);

        if (result.success) {
            await loadSettings();
            showToast('success', 'Collection point deleted!');
        } else {
            showToast('error', 'Failed to delete point: ' + result.error);
        }
    }

    if (loading) return <div className="p-8 text-gray-400 text-sm">Loading settings…</div>;
    if (!settings) return null;

    return (
        <div className="max-w-4xl pb-20">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Collection Settings</h1>
                    <p className="text-sm text-gray-400">Manage self-collection points</p>
                </div>
            </div>

            {/* Toggle */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={settings.enabled}
                        onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <div>
                        <div className="font-medium text-gray-900">Enable Self-Collection</div>
                        <div className="text-xs text-gray-400">Allow customers to pick up orders at collection points</div>
                    </div>
                </label>
            </div>

            {/* Collection Points */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-700">Collection Points ({settings.collection_points.length})</h2>
                    <button onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                        <Plus size={14} /> Add Point
                    </button>
                </div>
                {settings.collection_points.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                        <p>No collection points yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {settings.collection_points.map(point => (
                            <CollectionPointCard key={point.id} point={point}
                                isEditing={editingPoint?.id === point.id}
                                onEdit={() => setEditingPoint(point)}
                                onSave={updates => handleUpdatePoint(point.id, updates)}
                                onCancel={() => setEditingPoint(null)}
                                onDelete={() => handleDeletePoint(point.id)} />
                        ))}
                    </div>
                )}
            </div>

            {showAddForm && <CollectionPointForm onSave={handleAddPoint} onCancel={() => setShowAddForm(false)} />}

            <div className="flex justify-end">
                <button onClick={handleSaveSettings} disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                    <Save size={15} /> {saving ? 'Saving…' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}

function CollectionPointCard({ point, isEditing, onEdit, onSave, onCancel, onDelete }: {
    point: CollectionPoint; isEditing: boolean; onEdit: () => void;
    onSave: (u: Partial<CollectionPoint>) => void; onCancel: () => void; onDelete: () => void;
}) {
    if (isEditing) return (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
            <CollectionPointForm initialData={point} onSave={onSave} onCancel={onCancel} isEdit />
        </div>
    );

    return (
        <div className={`border rounded-lg p-4 transition-colors ${point.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{point.name}</h3>
                        {!point.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactive</span>}
                    </div>
                    <p className="text-sm text-gray-500">{point.address}</p>
                    <p className="text-xs text-gray-400">{point.postcode}, {point.state}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span>Fee: <strong className="text-blue-600">RM {point.collection_fee.toFixed(2)}</strong></span>
                        {point.operating_hours && <span>Hours: {point.operating_hours}</span>}
                        {point.contact_phone && <span>Phone: {point.contact_phone}</span>}
                    </div>
                </div>
                <div className="flex gap-1 ml-2">
                    <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit size={15} /></button>
                    <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={15} /></button>
                </div>
            </div>
        </div>
    );
}

function CollectionPointForm({ initialData, onSave, onCancel, isEdit = false }: {
    initialData?: Partial<CollectionPoint>; onSave: (d: any) => void; onCancel: () => void; isEdit?: boolean;
}) {
    const [f, setF] = useState({
        name: initialData?.name || '', address: initialData?.address || '',
        postcode: initialData?.postcode || '', state: initialData?.state || '',
        collection_fee: initialData?.collection_fee || 0,
        operating_hours: initialData?.operating_hours || '',
        contact_phone: initialData?.contact_phone || '',
        contact_email: initialData?.contact_email || '',
        is_active: initialData?.is_active ?? true,
    });
    const inp = "w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400";

    return (
        <form onSubmit={e => { e.preventDefault(); onSave(f); }} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{isEdit ? 'Edit' : 'Add'} Collection Point</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div><label className="text-xs text-gray-500 mb-1 block">Name *</label><input type="text" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={inp} required /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Fee (RM) *</label><input type="number" step="0.01" value={f.collection_fee} onChange={e => setF({ ...f, collection_fee: parseFloat(e.target.value) || 0 })} className={inp} required /></div>
                <div className="md:col-span-2"><label className="text-xs text-gray-500 mb-1 block">Address *</label><input type="text" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} className={inp} required /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Postcode *</label><input type="text" value={f.postcode} onChange={e => setF({ ...f, postcode: e.target.value })} className={inp} required /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">State *</label><input type="text" value={f.state} onChange={e => setF({ ...f, state: e.target.value })} className={inp} required /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Operating Hours</label><input type="text" value={f.operating_hours} onChange={e => setF({ ...f, operating_hours: e.target.value })} placeholder="Mon-Fri 9AM-6PM" className={inp} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Contact Phone</label><input type="text" value={f.contact_phone} onChange={e => setF({ ...f, contact_phone: e.target.value })} placeholder="+60123456789" className={inp} /></div>
                <div className="md:col-span-2"><label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} className="rounded border-gray-300 text-blue-600" /> Active (visible to customers)</label></div>
            </div>
            <div className="flex gap-2">
                <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"><Save size={14} /> {isEdit ? 'Update' : 'Add'} Point</button>
                <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded hover:border-gray-300"><X size={14} /> Cancel</button>
            </div>
        </form>
    );
}
