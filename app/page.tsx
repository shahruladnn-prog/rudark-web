import { adminDb } from '@/lib/firebase-admin';
import { serializeDocs } from '@/lib/serialize-firestore';
import ProductCard from '@/components/product-card';
import { Product } from '@/types';
import dynamicImport from 'next/dynamic';
import ActivityGrid from '@/components/activity-grid';
import FeaturedStory from '@/components/featured-story';
import { getCategories } from '@/actions/category-actions';

export const dynamic = 'force-dynamic';

// Lazy load AnimatedLogo to defer framer-motion loading
const AnimatedLogo = dynamicImport(() => import('@/components/animated-logo'), {
  loading: () => <div className="h-screen bg-rudark-matte" />
});

const TIMEOUT_MS = 5000;

function promiseWithTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Home] Data fetch timed out after ${ms}ms`);
      resolve(fallback);
    }, ms);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

async function getProducts() {
  try {
    // console.log('[Home] Fetching products...');
    const productsRef = adminDb.collection('products');
    if (!productsRef) return [];

    const snapshot = await productsRef.where('stock_status', '!=', 'ARCHIVED').limit(8).get();

    if (snapshot.empty) return [];

    return serializeDocs<Product>(snapshot);
  } catch (error) {
    console.error('[Home] Error fetching products:', error);
    return [];
  }
}

export default async function Home() {
  // Parallel fetch with timeouts
  const [products, categories]: [Product[], any[]] = await Promise.all([
    promiseWithTimeout(getProducts(), TIMEOUT_MS, []),
    promiseWithTimeout(getCategories().catch(() => []), TIMEOUT_MS, [])
  ]);

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
