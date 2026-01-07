'use server';

import { adminDb } from '@/lib/firebase-admin';

const SEED_DATA = {
    "website_structure": {
        "brand_name": "Rud'Ark",
        "main_navigation": [
            {
                "category_name": "Apparel",
                "slug": "apparel",
                "description": "Clothing for outdoor and water sports activities.",
                "subcategories": [
                    {
                        "name": "Men's Apparel",
                        "items_included": ["T-Shirts", "Jackets", "Windbreakers"]
                    },
                    {
                        "name": "Women's Apparel",
                        "items_included": ["T-Shirts", "Jackets", "Windbreakers"]
                    },
                    {
                        "name": "Kids' Apparel",
                        "items_included": ["Child T-Shirts"]
                    }
                ]
            },
            {
                "category_name": "Watercraft",
                "slug": "watercraft",
                "description": "Primary vessels for water sports.",
                "subcategories": [
                    {
                        "name": "Kayaks",
                        "items_included": ["Touring Kayaks", "Fishing Kayaks", "Recreational Kayaks"]
                    },
                    {
                        "name": "Rafts",
                        "items_included": ["White Water Rafting Boats", "Inflatable Rafts"]
                    }
                ]
            },
            {
                "category_name": "Gear & Safety",
                "slug": "gear-and-safety",
                "description": "Essential technical equipment and safety gear.",
                "subcategories": [
                    {
                        "name": "PFDs / Life Vests",
                        "items_included": ["Kayak Life Jackets", "White Water Rafting PFDs"]
                    },
                    {
                        "name": "Paddles",
                        "items_included": ["Rafting Paddles", "Kayak Paddles"]
                    },
                    {
                        "name": "Helmets",
                        "items_included": ["Water Sports Helmets"]
                    },
                    {
                        "name": "Dry Bags & Storage",
                        "items_included": ["Dry Bags", "Waterproof Phone Cases"]
                    }
                ]
            },
            {
                "category_name": "Glamping & Camping",
                "slug": "glamping-and-camping",
                "description": "Equipment for outdoor living and comfort.",
                "subcategories": [
                    {
                        "name": "Tents",
                        "items_included": ["Glamping Tents", "Safari Tents"]
                    },
                    {
                        "name": "Furniture",
                        "items_included": ["Camp Chairs", "Tables", "Cots"]
                    },
                    {
                        "name": "Camp Lifestyle",
                        "items_included": ["Bottles", "Mugs", "Utensils", "Accessories"]
                    }
                ]
            },
            {
                "category_name": "Services",
                "slug": "services",
                "description": "Professional services, training, and repairs.",
                "subcategories": [
                    {
                        "name": "Academy & Training",
                        "items_included": ["Training Courses", "Certifications"]
                    },
                    {
                        "name": "Consultation",
                        "items_included": ["Business Consultation", "Site Setup"]
                    },
                    {
                        "name": "Maintenance & Repair",
                        "items_included": ["Boat Repair Service", "Patching Kits"]
                    }
                ]
            }
        ]
    }
};

export async function seedCategories() {
    try {
        console.log("Starting Category Seed...");
        const batch = adminDb.batch();

        for (const cat of SEED_DATA.website_structure.main_navigation) {
            const ref = adminDb.collection('categories').doc(cat.slug);

            // Transform subcategories to add slugs if missing
            const subcategories = cat.subcategories.map(sub => ({
                name: sub.name,
                slug: sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                items_included: sub.items_included
            }));

            batch.set(ref, {
                name: cat.category_name, // Standardize on 'name'
                category_name: cat.category_name, // Keep for legacy
                slug: cat.slug,
                description: cat.description,
                subcategories: subcategories,
                updated_at: new Date()
            });
        }

        await batch.commit();
        console.log("Category Seed Complete.");
        return { success: true };
    } catch (error) {
        console.error("Seed Error:", error);
        return { success: false, error: 'Seed failed' };
    }
}
