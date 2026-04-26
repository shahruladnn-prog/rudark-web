'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2, Globe, EyeOff, Tag as TagIcon, Image as ImageIcon, Type, FileText } from 'lucide-react';
import Link from 'next/link';
import { createPost, updatePost } from '@/actions/blog-actions';
import { useToast } from '@/components/ui/toast';
import { BlogPost } from '@/types';

interface BlogFormProps {
    initialData?: BlogPost;
    isEditing?: boolean;
}

export default function BlogForm({ initialData, isEditing = false }: BlogFormProps) {
    const { showToast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        slug: initialData?.slug || '',
        excerpt: initialData?.excerpt || '',
        body: initialData?.body || '',
        cover_image: initialData?.cover_image || '',
        tags: initialData?.tags?.join(', ') || '',
        published: initialData?.published ?? false
    });

    // Auto-generate slug from title
    useEffect(() => {
        if (!isEditing && formData.title) {
            const generatedSlug = formData.title
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
            setFormData(prev => ({ ...prev, slug: generatedSlug }));
        }
    }, [formData.title, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const dataToSave = {
            ...formData,
            tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== '')
        };

        try {
            if (isEditing && initialData?.id) {
                await updatePost(initialData.id, dataToSave);
                showToast('success', 'Post updated successfully');
            } else {
                await createPost(dataToSave);
                showToast('success', 'Post created successfully');
            }
            router.push('/admin/blog');
            router.refresh();
        } catch (error) {
            showToast('error', 'Failed to save post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-5xl pb-20">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin/blog" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditing ? 'Edit Post' : 'New Post'}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {isEditing ? 'Update your content' : 'Create a new blog article'}
                        </p>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isEditing ? 'Update Post' : 'Publish Post'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Content Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Type size={16} className="text-gray-400" /> Title
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Post title..."
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-lg font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <FileText size={16} className="text-gray-400" /> Body (Markdown)
                            </label>
                            <textarea
                                required
                                rows={15}
                                value={formData.body}
                                onChange={e => setFormData({ ...formData, body: e.target.value })}
                                placeholder="Write your post content in markdown..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* Excerpt Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Excerpt</label>
                            <textarea
                                required
                                rows={3}
                                value={formData.excerpt}
                                onChange={e => setFormData({ ...formData, excerpt: e.target.value })}
                                placeholder="Short summary for SEO and card display..."
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Status & Settings */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-gray-700 block">Status</label>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, published: !formData.published })}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                                    formData.published 
                                    ? 'bg-green-50 border-green-200 text-green-700' 
                                    : 'bg-gray-50 border-gray-200 text-gray-600'
                                }`}
                            >
                                <span className="flex items-center gap-2 font-medium">
                                    {formData.published ? <Globe size={18} /> : <EyeOff size={18} />}
                                    {formData.published ? 'Published' : 'Draft'}
                                </span>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.published ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.published ? 'right-1' : 'left-1'}`} />
                                </div>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Globe size={16} className="text-gray-400" /> URL Slug
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.slug}
                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                placeholder="url-slug-here"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-mono"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <TagIcon size={16} className="text-gray-400" /> Tags
                            </label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                placeholder="Diving, Gear, Guide..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                            <p className="text-[10px] text-gray-400">Comma separated values</p>
                        </div>
                    </div>

                    {/* Image Card */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <ImageIcon size={16} className="text-gray-400" /> Cover Image URL
                            </label>
                            <input
                                type="url"
                                value={formData.cover_image}
                                onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                                placeholder="https://..."
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                            />
                        </div>
                        {formData.cover_image && (
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                <img src={formData.cover_image} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}
