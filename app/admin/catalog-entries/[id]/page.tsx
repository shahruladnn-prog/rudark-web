import { notFound } from 'next/navigation';
import { getCatalogEntry } from '@/actions/catalog-actions';
import CatalogEntryForm from '@/components/admin/catalog-entry-form';
import { CatalogEntry } from '@/types';

export default async function AdminCatalogEntryEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (id === 'new') {
        return <CatalogEntryForm />;
    }

    const entry = await getCatalogEntry(id);
    if (!entry) notFound();

    return <CatalogEntryForm initialData={entry as CatalogEntry & { id: string }} />;
}
