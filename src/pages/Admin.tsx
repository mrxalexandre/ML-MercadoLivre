import { useState, useEffect, type FormEvent } from 'react';
import { Search, Loader2, AlertCircle, ShoppingBag, ExternalLink, LogIn, Trash2 } from 'lucide-react';
import { MeliProduct } from '../types';
import ProductCard from '../components/ProductCard';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';

export default function Admin() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<(MeliProduct & { docId: string })[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        docId: doc.id,
        ...doc.data()
      })) as (MeliProduct & { docId: string })[];
      setProducts(prods);
    }, (error) => {
      console.error("Error listening to products:", error);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
    };
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!user) {
      setError("Você precisa estar logado para adicionar produtos.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocorreu um erro ao buscar o produto.');
      }

      const productData = { ...data, permalink: url.trim() };
      
      // Save to firestore
      await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: serverTimestamp()
      });
      
      setUrl('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (docId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'products', docId));
    } catch (err) {
      console.error("Error deleting product", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans overflow-x-hidden">
      <header className="bg-indigo-600 p-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center font-black text-indigo-900 text-xl">ML</div>
          <h1 className="text-white font-bold text-2xl tracking-tight">MRX<span className="text-amber-300 italic">scraper</span> <span className="text-sm font-normal text-indigo-300 ml-2">Painel Admin</span></h1>
        </div>
        <div className="flex items-center gap-4 text-indigo-100 font-bold">
          <a href="/" target="_blank" className="flex items-center gap-2 hover:text-white transition-colors bg-indigo-500 px-3 py-1.5 rounded-lg text-sm">
            Ver Vitrine <ExternalLink className="w-4 h-4" />
          </a>
          <div className="flex items-center gap-2 bg-indigo-700/50 px-4 py-2 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
            <span>{products.length} {products.length === 1 ? 'Produto' : 'Produtos'}</span>
          </div>
          {user ? (
            <button onClick={handleLogout} className="text-sm bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-lg transition-colors">Sair</button>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-lg transition-colors">
              <LogIn className="w-4 h-4"/> Entrar
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-8 max-w-[1400px] w-full mx-auto">
        <div className="w-full flex flex-col gap-6">
          <div className="text-center mb-2 mt-4">
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2">Painel de Vendas</h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto">Adicione os links dos produtos abaixo para montar sua vitrine. Os clientes serão redirecionados diretamente para a sua oferta.</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto bg-white rounded-[2rem] p-3 shadow-xl border-4 border-indigo-100 flex flex-col md:flex-row items-center gap-4">
            <div className="pl-4 text-indigo-400 hidden md:block">
              <Search className="w-6 h-6" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Cole o link do Mercado Livre aqui..."
              className="flex-1 w-full outline-none text-lg text-slate-700 bg-transparent px-4 md:px-0 py-2 md:py-0"
              required
              disabled={!user}
            />
            <button
              type="submit"
              disabled={loading || !url.trim() || !user}
              className="w-full md:w-auto bg-pink-500 hover:bg-pink-600 disabled:bg-slate-300 text-white px-8 py-3 rounded-full font-bold text-lg shadow-md transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>ADICIONANDO</span>
                </>
              ) : (
                <span>ADICIONAR PRODUTO</span>
              )}
            </button>
          </form>
          
          {!user && (
            <div className="flex items-center justify-center gap-2 text-amber-700 bg-amber-50 py-3 px-4 rounded-xl border border-amber-200 max-w-2xl mx-auto">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Faça login para adicionar novos produtos.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 py-3 px-4 rounded-xl border border-red-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in duration-500">
            {products.map((product, index) => (
              <div key={product.docId} className="relative group">
                <ProductCard product={product} />
                {user && (
                   <button 
                     onClick={() => handleDelete(product.docId)}
                     className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                     title="Excluir produto"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 mt-12 opacity-50">
            <ShoppingBag className="w-16 h-16" />
            <p className="font-bold uppercase tracking-wider text-sm">Sua vitrine está vazia</p>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-between text-slate-400 text-[10px] font-bold tracking-widest uppercase mt-4 p-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          Painel Admin Ativo
        </div>
        <div>© 2024 MRXscraper</div>
      </footer>
    </div>
  );
}
