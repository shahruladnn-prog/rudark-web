'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Search, Plus, RefreshCw, FileText, Eye, EyeOff } from 'lucide-react';
import { getPosts, deletePost } from '@/actions/blog-actions';
import { useToast } from '@/components/ui/toast';
import { BlogPost } from '@/types';

export default function AdminBlogPage() {
    const { showToast } = useToast();
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadPosts = async () => {
        setLoading(true);
        try {
            const data = await getPosts(false);
            setPosts(data);
        } catch {
            showToast('error', 'Failed to load blog posts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPosts(); }, []);

    const filteredPosts = useMemo(() => {
        return posts.filter(p => {
            const q = searchQuery.toLowerCase();
            return !q || p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q);
        });
    }, [posts, searchQuery]);

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Delete post "${title}"? This cannot be undone.`)) return;
        try {
            await deletePost(id);
            showToast('success', 'Post deleted');
            loadPosts();
        } catch {
            showToast('error', 'Failed to delete post');
        }
    };

    return (
        <div className="max-w-7xl pb-20">
            {/* Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Blog Posts</h1>
                    <p className="text-sm text-gray-400">Manage your content and SEO articles</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadPosts} disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors rounded text-sm disabled:opacity-50">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <Link href="/admin/blog/new"
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
                        <Plus size={15} /> New Post
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input type="text" placeholder="Search by title or slug…" value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 placeholder-gray-400" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Post</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">Loading posts…</td>
                            </tr>
                        ) : filteredPosts.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">No blog posts found</td>
                            </tr>
                        ) : (
                            filteredPosts.map((post) => (
                                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        {post.published ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider">
                                                <Eye size={10} /> Published
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                                                <EyeOff size={10} /> Draft
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{post.title}</div>
                                        <div className="text-xs text-gray-400 font-mono">/{post.slug}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(post.created_at?.seconds * 1000).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/blog/${post.slug}`} target="_blank"
                                                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="View Public">
                                                <Eye size={16} />
                                            </Link>
                                            <Link href={`/admin/blog/${post.id}/edit`}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                                                <Edit size={16} />
                                            </Link>
                                            <button onClick={() => post.id && handleDelete(post.id, post.title)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
