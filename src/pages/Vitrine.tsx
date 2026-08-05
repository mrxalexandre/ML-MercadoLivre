import { useState, useEffect } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import { MeliProduct } from '../types';
import ProductCard from '../components/ProductCard';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Vitrine() {
  const [products, setProducts] = useState<(MeliProduct & { docId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    // Track unique visitor by IP
    const trackVisitor = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data.ip) {
          await setDoc(doc(db, 'visitors', data.ip.replace(/\./g, '_')), {
            ip: data.ip,
            lastVisit: serverTimestamp()
          }, { merge: true });
        }
      } catch (err) {
        console.error("Failed to track visitor", err);
      }
    };
    trackVisitor();

    // We don't order by in query so we can handle custom 'order' locally with fallback
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      })) as (MeliProduct & { docId: string, order?: number, createdAt?: any })[];
      
      prods.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setCoupon(docSnap.data().dailyCoupon || '');
      } else {
        setCoupon('');
      }
    });

    return () => {
      unsubscribe();
      unsubscribeSettings();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#ebebeb] font-sans">
      {/* Header (Mercado Livre Style) */}
      <header className="bg-[#fff159] p-3 flex flex-col gap-3 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="hidden md:flex relative flex-1 max-w-[500px]">
              <input 
                type="text" 
                placeholder="Buscar produtos, marcas e muito mais..." 
                className="w-full bg-white text-slate-800 rounded-sm py-2 px-4 shadow-sm outline-none focus:ring-1 focus:ring-slate-300 h-10 placeholder-slate-400"
              />
              <button className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-slate-500 border-l border-slate-200">
                <Search className="w-5 h-5" />
              </button>
            </div>
            <div className="hidden md:flex relative w-[200px] h-10 bg-white rounded-sm overflow-hidden shadow-sm items-center">
              <img src="/src/assets/images/happy_shoppers_1785165207545.jpg" alt="Pessoas felizes comprando" className="w-full h-full object-cover" />
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-[#333]">
            <a href="#" className="hidden lg:flex items-center gap-2 hover:text-black">
              <span className="text-sm font-semibold">Ofertas do Dia</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 py-8">
        <h1 className="text-2xl text-slate-800 font-semibold mb-6 flex flex-wrap items-center gap-3">
          Ofertas do Dia do Mercado Livre
          <span className="bg-[#3483fa] text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wider">Novo</span>
          {coupon && (
            <span className="bg-pink-500 text-white text-xs uppercase font-bold px-3 py-1 rounded-md tracking-wider flex items-center gap-1 shadow-sm">
              CUPOM DO DIA: <span className="text-pink-100">{coupon}</span>
            </span>
          )}
        </h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3483fa]"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.docId} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-md p-10 text-center shadow-sm flex flex-col items-center justify-center">
            <ShoppingBag className="w-16 h-16 text-slate-200 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800">Não há ofertas disponíveis no momento.</h2>
            <p className="text-slate-500 mt-2">Volte mais tarde para conferir as novidades.</p>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white py-6 border-t border-slate-200 mt-auto">
        <div className="max-w-[1200px] mx-auto px-4 text-xs text-slate-500 text-center flex flex-col gap-2">
          <p>Ofertas diarias especiais. Você será direcionado ao site oficial do ML</p>
        </div>
      </footer>
    </div>
  );
}
