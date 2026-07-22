import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Bell, ShoppingCart, Menu } from 'lucide-react';
import { MeliProduct } from '../types';
import ProductCard from '../components/ProductCard';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function Vitrine() {
  const [products, setProducts] = useState<(MeliProduct & { docId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      })) as (MeliProduct & { docId: string })[];
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#ebebeb] font-sans">
      {/* Header (Mercado Livre Style) */}
      <header className="bg-[#fff159] p-3 flex flex-col gap-3 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="cursor-pointer flex items-center">
              <img 
                src="https://bring.com.br/blog/wp-content/uploads/2018/05/Mercado-Livre-logo.png" 
                alt="Mercado Livre" 
                className="h-10 object-contain"
              />
            </div>
            
            <div className="hidden md:flex relative w-[500px]">
              <input 
                type="text" 
                placeholder="Buscar produtos, marcas e muito mais..." 
                className="w-full bg-white text-slate-800 rounded-sm py-2 px-4 shadow-sm outline-none focus:ring-1 focus:ring-slate-300 h-10 placeholder-slate-400"
              />
              <button className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-slate-500 border-l border-slate-200">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-[#333]">
            <a href="#" className="hidden lg:flex items-center gap-2 hover:text-black">
              <span className="text-sm font-semibold">Ofertas do Dia</span>
            </a>
            <div className="flex items-center gap-4">
              <Bell className="w-5 h-5 cursor-pointer hover:text-black" />
              <ShoppingCart className="w-5 h-5 cursor-pointer hover:text-black" />
              <Menu className="w-6 h-6 md:hidden cursor-pointer hover:text-black" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 py-8">
        <h1 className="text-2xl text-slate-800 font-semibold mb-6 flex items-center gap-3">
          Ofertas do Dia do Mercado Livre
          <span className="bg-[#3483fa] text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wider">Novo</span>
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
          <p>Trabalhe conosco • Termos e condições • Como cuidamos da sua privacidade • Acessibilidade • Contato • Informações sobre seguros</p>
          <p>Copyright © 1999-2024 Ebazar.com.br LTDA.</p>
          <p>CNPJ n.º 03.007.331/0001-41 / Av. das Nações Unidas, nº 3.003, Bonfim, Osasco/SP - CEP 06233-903</p>
        </div>
      </footer>
    </div>
  );
}
