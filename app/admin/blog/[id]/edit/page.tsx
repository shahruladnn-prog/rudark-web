import { notFound } from 'next/navigation';
import { getPostById } from '@/actions/blog-actions';
import BlogForm from '@/components/admin/blog-form';

interface Props {
    params: { id: string };
}

export default async function EditBlogPostPage({ params }: Props) {
    const post = await getPostById(params.id);

    if (!post) {
        notFound();
    }

    return <BlogForm initialData={post} isEditing />;
}
