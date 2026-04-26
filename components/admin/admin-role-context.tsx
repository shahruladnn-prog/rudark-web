'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getAdminRole } from '@/actions/admin-auth-actions';
import { AdminRole } from '@/types';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AdminRoleContextType {
    role: AdminRole | null;
    loading: boolean;
}

const AdminRoleContext = createContext<AdminRoleContextType>({ role: null, loading: true });

export function AdminRoleProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [role, setRole] = useState<AdminRole | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                setLoading(false);
                return;
            }

            getAdminRole(user.uid).then((r) => {
                setRole(r);
                setLoading(false);

                if (!r) {
                    // router.push('/login'); // We let AdminGuard handle initial auth redirect, but role redirect is here
                    return;
                }

                // Role-based gating
                if (r === 'warehouse') {
                    if (!pathname.startsWith('/admin/stock')) {
                        router.replace('/admin/stock');
                    }
                } else if (r === 'staff') {
                    const restrictedPaths = ['/admin/stores', '/admin/payment-settings', '/admin/logs', '/admin/users'];
                    if (restrictedPaths.some(p => pathname.startsWith(p))) {
                        router.replace('/admin');
                    }
                }
            });
        }
    }, [user, authLoading, pathname, router]);

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-rudark-matte text-rudark-volt">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (user && !role) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-rudark-matte text-white p-8 text-center">
                <div>
                    <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
                    <p className="text-gray-400 mb-8">You do not have administrative access. Please contact the owner.</p>
                    <button 
                        onClick={() => router.push('/login')}
                        className="bg-rudark-volt text-black px-6 py-2 rounded font-bold"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AdminRoleContext.Provider value={{ role, loading }}>
            {children}
        </AdminRoleContext.Provider>
    );
}

export const useAdminRole = () => useContext(AdminRoleContext);
