export const MENU_CATEGORIES = [
    {
        id: 'shop',
        label: 'SHOP',
        columns: [
            {
                title: 'Kayaks',
                items: [
                    { label: 'Fishing Kayaks', href: '/shop/kayaks/fishing' },
                    { label: 'Touring Kayaks', href: '/shop/kayaks/touring' },
                    { label: 'Whitewater', href: '/shop/kayaks/whitewater' },
                    { label: 'Inflatable', href: '/shop/kayaks/inflatable' },
                ]
            },
            {
                title: 'Gear & Safety',
                items: [
                    { label: 'Life Vests (PFDs)', href: '/shop/gear/pfds' },
                    { label: 'Paddles', href: '/shop/gear/paddles' },
                    { label: 'Helmets', href: '/shop/gear/helmets' },
                    { label: 'Dry Bags', href: '/shop/gear/dry-bags' },
                ]
            },
            {
                title: 'Accessories',
                items: [
                    { label: 'Rod Holders', href: '/shop/accessories/rod-holders' },
                    { label: 'Anchors', href: '/shop/accessories/anchors' },
                    { label: 'Carts & Racks', href: '/shop/accessories/transport' },
                    { label: 'Electronics', href: '/shop/accessories/electronics' },
                ]
            }
        ],
        featured: {
            image: '/menu-feature-kayak.jpg',
            title: 'New Predator Series',
            href: '/shop/collections/predator'
        }
    },
    {
        id: 'activities',
        label: 'ACTIVITIES',
        columns: [
            {
                title: 'By Pursuit',
                items: [
                    { label: 'Angling', href: '/activities/angling' },
                    { label: 'Touring', href: '/activities/touring' },
                    { label: 'Expedition', href: '/activities/expedition' },
                    { label: 'Recreational', href: '/activities/rec' },
                ]
            }
        ],
        featured: {
            image: '/menu-feature-action.jpg',
            title: 'Expedition Stories',
            href: '/stories'
        }
    }
];
