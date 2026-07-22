import React from 'react';
import { MeliProduct } from '../types';
import { PlayCircle } from 'lucide-react';

interface ProductCardProps {
  product: MeliProduct;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const image = product.pictures?.[0]?.secure_url || product.secure_thumbnail || product.thumbnail;

  return (
    <a
      href={product.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-md p-0 shadow-sm border border-slate-100 flex flex-col hover:shadow-lg transition-shadow duration-300 group cursor-pointer overflow-hidden"
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
