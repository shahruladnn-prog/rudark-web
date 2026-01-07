export const CATEGORY_MAP = {
    "brand_name": "Rud'Ark",
    "main_navigation": [
        {
            "category_name": "Apparel", "slug": "apparel",
            "subcategories": [
                { "name": "Men's Apparel", "slug": "mens-apparel" },
                { "name": "Women's Apparel", "slug": "womens-apparel" },
                { "name": "Kids' Apparel", "slug": "kids-apparel" }
            ]
        },
        {
            "category_name": "Watercraft", "slug": "watercraft",
            "subcategories": [
                { "name": "Kayaks", "slug": "kayaks" },
                { "name": "Rafts", "slug": "rafts" }
            ]
        },
        {
            "category_name": "Gear & Safety", "slug": "gear-and-safety",
            "subcategories": [
                { "name": "PFDs / Life Vests", "slug": "pfds" },
                { "name": "Paddles", "slug": "paddles" },
                { "name": "Helmets", "slug": "helmets" },
                { "name": "Dry Bags & Storage", "slug": "dry-bags" }
            ]
        },
        {
            "category_name": "Glamping & Camping", "slug": "glamping-and-camping",
            "subcategories": [
                { "name": "Tents", "slug": "tents" },
                { "name": "Furniture", "slug": "furniture" },
                { "name": "Camp Lifestyle", "slug": "camp-lifestyle" }
            ]
        },
        {
            "category_name": "Services", "slug": "services",
            "subcategories": [
                { "name": "Academy & Training", "slug": "academy" },
                { "name": "Consultation", "slug": "consultation" },
                { "name": "Maintenance & Repair", "slug": "maintenance" }
            ]
        }
    ]
};

// Helper function to flatten subcategories for easy lookup
export const SUB_CATEGORY_LOOKUP = CATEGORY_MAP.main_navigation.flatMap(cat =>
    cat.subcategories.map(sub => ({
        ...sub,
        parent_slug: cat.slug,
        parent_name: cat.category_name
    }))
);
