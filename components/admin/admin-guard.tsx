'use client';

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { verifySession } from '@/actions/session-actions';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const [sessionValid, setSessionValid] = useState<boolean | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else {
                const checkSession = async () => {
                    const isValid = await verifySession();
                    if (!isValid) {
                        router.push('/login');
                    } else {
                        setSessionValid(true);
                    }
                };
                checkSession();
            }
        }
    }, [user, loading, router]);

    if (loading || sessionValid === null) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-rudark-matte text-rudark-volt">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    if (!user || !sessionValid) {
        return null; // Will redirect
    }

    return <>{children}</>;
}
