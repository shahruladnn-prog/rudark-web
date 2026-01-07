import { adminDb } from '@/lib/firebase-admin';
import ProductCard from '@/components/product-card';
import { Product } from '@/types';
import AnimatedLogo from '@/components/animated-logo';
import ActivityGrid from '@/components/activity-grid';
import FeaturedStory from '@/components/featured-story';
import { getCategories } from '@/actions/category-actions';

export const dynamic = 'force-dynamic';

async function getProducts() {
  try {
    // console.log('[Home] Fetching products...');
    const productsRef = adminDb.collection('products');
    // Basic check to see if collection exists/works (mock db handling)
    if (!productsRef) return [];

    const snapshot = await productsRef.where('stock_status', '!=', 'ARCHIVED').limit(8).get();

    if (snapshot.empty) {
      return [];
    }

    // Firestore returns plain objects, need to serialize for Next.js
    const products: Product[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        sku: data.sku,
        name: data.name,
        web_price: data.web_price,
        description: data.description,
        images: data.images,
        category: data.category,
        stock_status: data.stock_status,
        loyverse_item_id: data.loyverse_item_id,
        loyverse_variant_id: data.loyverse_variant_id,
        // Ensure optional fields have fallbacks to prevent serialization errors
        is_featured: data.is_featured || false,
        tags: data.tags || [],
        category_slug: data.category_slug || ''
      } as unknown as Product;
    });

    return products;
  } catch (error) {
    console.error('[Home] Error fetching products:', error);
    return [];
  }
}

export default async function Home() {
  const products = await getProducts();
  const categories: any[] = await getCategories().catch(() => []);

  return (
    <div className="min-h-screen bg-rudark-matte selection:bg-rudark-volt selection:text-black">
      {/* 1. Cinematic Hero */}
      <AnimatedLogo />

      {/* 2. Shop By Activity (Black Diamond Style Grid) */}
      <ActivityGrid categories={categories} />

      {/* 3. Brand Story Block */}
      <FeaturedStory />

      {/* 4. New Arrivals (Product Carousel/Grid) */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-24 relative z-10 bg-rudark-matte">
        <div className="flex items-end justify-between mb-12 border-b border-rudark-grey pb-4 section-start">
          <h2 className="text-4xl md:text-5xl font-condensed font-bold text-white uppercase">
            New <span className="text-rudark-volt">Arrivals</span>
          </h2>
          <span className="text-gray-500 font-mono text-xs hidden md:block tracking-widest">
               // FALL_WINTER_2025_DROP
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 bg-rudark-carbon rounded-sm border border-rudark-grey border-dashed">
            <p className="text-gray-400 font-condensed text-2xl uppercase">No products found</p>
            <p className="text-gray-600 font-mono text-sm mt-2">Initialize synchronization sequence in Admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
