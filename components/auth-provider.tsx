'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!app) {
            setLoading(false);
            return;
        }

        try {
            const auth = getAuth(app);
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                setUser(user);
                setLoading(false);

                // Basic Protection Logic
                if (!user && pathname.startsWith('/admin')) {
                    router.push('/login');
                }
            });
            return () => unsubscribe();
        } catch (err) {
            console.error("Auth Init Failed:", err);
            setLoading(false);
        }
    }, [pathname, router]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
