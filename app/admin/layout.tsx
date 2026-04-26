import AdminSidebar from "@/components/admin/sidebar";
import AdminGuard from "@/components/admin/admin-guard";
import CommandPalette from "@/components/admin/command-palette";
import { isFirebaseAdminMock } from '@/lib/firebase-admin';
import { AdminRoleProvider } from "@/components/admin/admin-role-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGuard>
            <AdminRoleProvider>
                <div className="flex min-h-screen bg-gray-50 text-gray-900">
                    <CommandPalette />
                    <AdminSidebar />
                    <main className="flex-1 md:ml-64 p-4 pt-20 md:p-8 md:pt-8 overflow-y-auto">
                        {isFirebaseAdminMock && (
                            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                ⚠️ Database connection missing — running in mock mode. Data will NOT be saved.
                            </div>
                        )}
                        {children}
                    </main>
                </div>
            </AdminRoleProvider>
        </AdminGuard>
    );
}

