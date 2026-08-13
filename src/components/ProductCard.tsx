import React, { useState, useEffect } from 'react';
import { MeliProduct } from '../types';
import { PlayCircle, Clock } from 'lucide-react';
import { doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

interface ProductCardProps {
  product: MeliProduct;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const image = product.pictures?.[0]?.secure_url || product.secure_thumbnail || product.thumbnail;
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!product.createdAt) return;

    const createdAtMs = typeof product.createdAt.toMillis === 'function' 
      ? product.createdAt.toMillis() 
      : product.createdAt;

    // Add 2 hours for each click and any manual bonus hours
    const clickBonusMs = (product.clicks || 0) * 2 * 60 * 60 * 1000;
    const manualBonusMs = (product.bonusHours || 0) * 60 * 60 * 1000;
    const expiresAt = createdAtMs + 24 * 60 * 60 * 1000 + clickBonusMs + manualBonusMs;

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expirado');
        
        // Auto-delete if we have admin rights
        const isAdmin = localStorage.getItem('admin_logged_in') === 'true';
        if (product.docId && isAdmin) {
          deleteDoc(doc(db, 'products', product.docId)).catch(console.error);
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [product.createdAt, product.docId]);

  const isAdmin = localStorage.getItem('admin_logged_in') === 'true';
  if (isExpired && !isAdmin) {
    return null;
  }

  const handleProductClick = () => {
    if (product.docId && !isAdmin) {
      updateDoc(doc(db, 'products', product.docId), {
        clicks: increment(1)
      }).catch(console.error);
    }
  };

  return (
    <a
      href={product.permalink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleProductClick}
      className={`bg-white rounded-md p-0 shadow-sm border border-slate-100 flex flex-col hover:shadow-lg transition-shadow duration-300 group cursor-pointer overflow-hidden ${isExpired ? 'opacity-50 grayscale' : ''}`}
    >
      <div className="w-full aspect-square bg-white relative overflow-hidden flex items-center justify-center border-b border-slate-100">
        {image ? (
           <img
             src={image}
             alt={product.title}
             className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
           />
        ) : (
           <div className="text-slate-300 font-bold uppercase text-xs">Sem Imagem</div>
        )}
        
        {timeLeft && (
          <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {timeLeft}
          </div>
        )}

        {product.video_id && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur p-1.5 rounded-full text-slate-800 shadow-sm">
            <PlayCircle className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 pt-3 gap-2">
        <h3 className="text-slate-500 font-normal text-sm leading-snug line-clamp-2">
          {product.title}
        </h3>
        
        <div className="text-xs text-green-600 font-semibold mt-1">
          Frete grátis
        </div>

        <div className="mt-auto pt-3">
          <div className="w-full bg-[#3483fa] hover:bg-[#2968c8] text-white font-semibold py-2.5 rounded-md text-sm text-center transition-colors">
            Clique e descubra a oferta
          </div>
        </div>
      </div>
    </a>
  );
};

export default ProductCard;
