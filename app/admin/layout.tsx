import AdminSidebar from "@/components/admin/sidebar";
import AdminGuard from "@/components/admin/admin-guard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGuard>
            <div className="flex min-h-screen bg-rudark-matte">
                <AdminSidebar />
                <main className="flex-1 ml-64 p-8 pt-28 overflow-y-auto">
                    {children}
                </main>
            </div>
        </AdminGuard>
    );
}
