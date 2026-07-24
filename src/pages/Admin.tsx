import { useState, useEffect, type FormEvent } from 'react';
import { Search, Loader2, AlertCircle, ShoppingBag, ExternalLink, LogIn, Trash2, GripVertical, X } from 'lucide-react';
import { MeliProduct } from '../types';
import ProductCard from '../components/ProductCard';
import { SortableProductCard } from '../components/SortableProductCard';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

export default function Admin() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<(MeliProduct & { docId: string, order?: number, createdAt?: any })[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [coupon, setCoupon] = useState('');
  const [savingCoupon, setSavingCoupon] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const adminStatus = localStorage.getItem('admin_logged_in') === 'true';
    setIsAdmin(adminStatus);

    const q = query(collection(db, 'products'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
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
    }, (error) => {
      console.error("Error listening to products:", error);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setCoupon(docSnap.data().dailyCoupon || '');
      } else {
        setCoupon('');
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeSettings();
    };
  }, []);

  const handleCustomLogin = (e: FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'mrxalexandre@gmail.com' && loginPassword === 'x123456') {
      localStorage.setItem('admin_logged_in', 'true');
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginError('');
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setLoginError("Credenciais inválidas.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in');
    setIsAdmin(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!isAdmin) {
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
      
      const nextOrder = products.length > 0 && products[0].order !== undefined 
        ? products[0].order - 1 
        : -1;

      // Save to firestore
      await addDoc(collection(db, 'products'), {
        ...productData,
        order: nextOrder,
        createdAt: serverTimestamp()
      });
      
      setUrl('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveCoupon = async () => {
    if (!isAdmin) return;
    setSavingCoupon(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), { dailyCoupon: coupon }, { merge: true });
    } catch (err) {
      console.error("Error saving coupon", err);
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'products', docId));
    } catch (err) {
      console.error("Error deleting product", err);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex(p => p.docId === active.id);
      const newIndex = products.findIndex(p => p.docId === over.id);
      
      const newProducts = arrayMove(products, oldIndex, newIndex);
      
      setProducts(newProducts);
      
      if (isAdmin) {
        try {
          const batch = writeBatch(db);
          newProducts.forEach((prod, index) => {
            const prodRef = doc(db, 'products', prod.docId);
            batch.update(prodRef, { order: index });
          });
          await batch.commit();
        } catch (err) {
          console.error("Error updating order in Firestore", err);
        }
      }
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
          {isAdmin ? (
            <button onClick={handleLogout} className="text-sm bg-indigo-800 hover:bg-indigo-900 px-3 py-1.5 rounded-lg transition-colors">Sair</button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 text-sm bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-lg transition-colors">
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
              disabled={!isAdmin}
            />
            <button
              type="submit"
              disabled={loading || !url.trim() || !isAdmin}
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

          {isAdmin && (
            <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Cupom do Dia</label>
                <input
                  type="text"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="Ex: OFERTA10"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all uppercase"
                />
              </div>
              <button
                onClick={handleSaveCoupon}
                disabled={savingCoupon}
                className="w-full md:w-auto mt-5 md:mt-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all flex justify-center items-center gap-2"
              >
                {savingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>SALVAR CUPOM</span>}
              </button>
            </div>
          )}
          
          {!isAdmin && (
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={products.map(p => p.docId)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in duration-500">
                {products.map((product) => (
                  <SortableProductCard key={product.docId} id={product.docId}>
                    <div className="relative group">
                      <ProductCard product={product} />
                      
                      {isAdmin && (
                         <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-md shadow-sm backdrop-blur-sm cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 z-10">
                           <GripVertical className="w-5 h-5" />
                         </div>
                      )}

                      {isAdmin && (
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDelete(product.docId);
                           }}
                           className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                           title="Excluir produto"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      )}
                    </div>
                  </SortableProductCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
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

      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-700">Acesso Administrativo</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCustomLogin} className="p-6 flex flex-col gap-4">
              {loginError && (
                <div className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100 text-center">
                  {loginError}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">Email</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Seu e-mail"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-600">Senha</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Sua senha"
                  required
                />
              </div>
              <button type="submit" className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors">
                Entrar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

