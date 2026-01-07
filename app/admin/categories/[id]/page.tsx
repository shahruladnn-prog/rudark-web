import { getCategory } from '@/actions/category-actions';
import CategoryForm from '@/components/admin/category-form';

export const dynamic = 'force-dynamic';

export default async function CategoryEditorPage({ params }: { params: { id: string } }) {
    const { id } = await Promise.resolve(params);
    let category = undefined;

    if (id !== 'new') {
        category = await getCategory(id);
    }

    return <CategoryForm initialData={category} id={id} />;
}
