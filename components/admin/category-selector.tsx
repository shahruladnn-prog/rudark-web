'use client';

import { useState, useEffect } from 'react';

interface CategorySelectorProps {
    selectedCategories: string[];
    onChange: (categories: string[]) => void;
    disabled?: boolean;
}

export default function CategorySelector({ selectedCategories, onChange, disabled }: CategorySelectorProps) {
    const [categories, setCategories] = useState<Array<{ slug: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Fetch categories from server action
                const { getCategories } = await import('@/actions/category-actions');
                const cats = await getCategories();
                setCategories(cats.map((c: any) => ({ slug: c.slug, name: c.name })));
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const toggleCategory = (slug: string) => {
        if (selectedCategories.includes(slug)) {
            onChange(selectedCategories.filter(s => s !== slug));
        } else {
            onChange([...selectedCategories, slug]);
        }
    };

    if (loading) {
        return <div className="text-gray-400">Loading categories...</div>;
    }

    if (categories.length === 0) {
        return <div className="text-gray-400">No categories found</div>;
    }

    return (
        <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-600 rounded p-3 bg-rudark-matte">
            {categories.map(cat => (
                <label key={cat.slug} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-2 rounded">
                    <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.slug)}
                        onChange={() => toggleCategory(cat.slug)}
                        disabled={disabled}
                        className="w-4 h-4 rounded border-gray-600 bg-rudark-charcoal text-rudark-volt focus:ring-rudark-volt"
                    />
                    <span className={disabled ? 'text-gray-500' : 'text-white'}>{cat.name}</span>
                </label>
            ))}
        </div>
    );
}
