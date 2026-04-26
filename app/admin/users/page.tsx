'use client';

import { useState, useEffect } from 'react';
import { getAdminUsers, addAdminUser, removeAdminUser } from '@/actions/admin-auth-actions';
import { AdminUser, AdminRole } from '@/types';
import { useToast } from '@/components/ui/toast';
import { useAdminRole } from '@/components/admin/admin-role-context';
import { Plus, Trash2, Shield, Mail, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function AdminUsersPage() {
    const { role } = useAdminRole();
    const { showToast } = useToast();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    // Form state
    const [newUid, setNewUid] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<AdminRole>('staff');

    const loadUsers = async () => {
        setLoading(true);
        const data = await getAdminUsers();
        setUsers(data);
        setLoading(false);
    };

    useEffect(() => {
        if (role === 'owner') {
            loadUsers();
        }
    }, [role]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUid || !newEmail) return;

        setAdding(true);
        const res = await addAdminUser({ uid: newUid, email: newEmail, role: newRole });
        setAdding(false);

        if (res.success) {
            showToast('success', 'Admin user added successfully');
            setNewUid('');
            setNewEmail('');
            setNewRole('staff');
            loadUsers();
        } else {
            showToast('error', res.error || 'Failed to add user');
        }
    };

    const handleRemove = async (uid: string) => {
        if (!confirm('Are you sure you want to remove this admin user?')) return;

        const res = await removeAdminUser(uid);
        if (res.success) {
            showToast('success', 'Admin user removed');
            loadUsers();
        } else {
            showToast('error', res.error || 'Failed to remove user');
        }
    };

    if (role !== 'owner') return null; // Context handles redirect, but just in case

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin User Management</h1>
                        <p className="text-gray-500 text-sm">Control who has access to the Command Center</p>
                    </div>
                </div>
                <Link
                    href="/admin/users/2fa"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900 rounded text-sm font-bold transition-colors"
                >
                    <Shield size={16} className="text-rudark-volt" />
                    Configure 2FA
                </Link>
            </div>

            {/* Add User Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                    <Plus size={14} /> Add Authorized Personnel
                </h2>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">User UID (from Firebase)</label>
                        <input
                            type="text"
                            value={newUid}
                            onChange={e => setNewUid(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            placeholder="UID"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Email Address</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            placeholder="email@rudark.com"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Access Role</label>
                        <select
                            value={newRole}
                            onChange={e => setNewRole(e.target.value as AdminRole)}
                            className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        >
                            <option value="owner">Owner (Full Access)</option>
                            <option value="staff">Staff (Limited Settings)</option>
                            <option value="warehouse">Warehouse (Stock Only)</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={adding}
                        className="bg-blue-600 text-white rounded px-6 py-2 text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 h-10"
                    >
                        {adding ? 'Adding...' : 'Add User'}
                    </button>
                </form>
                <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded text-[10px] text-amber-700">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p>Users must already have a Firebase Auth account created via the login page or manually in the console before being added here.</p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Officer</th>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Role</th>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider">Joined</th>
                            <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">Loading authorized personnel...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">No admin users found.</td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                                                {user.email.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{user.email}</div>
                                                <div className="text-[10px] font-mono text-gray-400 uppercase">{user.uid}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                            user.role === 'staff' ? 'bg-blue-100 text-blue-700' :
                                            'bg-orange-100 text-orange-700'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRemove(user.uid)}
                                            className="text-red-400 hover:text-red-600 transition-colors p-2"
                                            title="Remove Access"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
