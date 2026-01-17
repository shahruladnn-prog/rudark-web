import AdminSidebar from "@/components/admin/sidebar";
import AdminGuard from "@/components/admin/admin-guard";
import { isFirebaseAdminMock } from '@/lib/firebase-admin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-rudark-matte">
                <AdminSidebar />
                <main className="flex-1 md:ml-64 p-4 pt-20 md:p-8 md:pt-28 overflow-y-auto">
                    {isFirebaseAdminMock && (
                        <div className="mb-6 p-4 bg-red-900/30 border border-red-500 text-red-200 font-mono text-sm uppercase tracking-wider flex items-center justify-center text-center">
                            [WARNING]: Database Connection Missing (No Private Key). <br />
                            Running in Read-Only / Mock Mode. Data will NOT be saved.
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </AdminGuard>
    );
}
