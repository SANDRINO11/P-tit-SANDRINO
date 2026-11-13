import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../data/products';
import { Button } from '../ui/Button';
import { ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-brand-grey hover:border-brand-green/20 hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-grey">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-brand-navy text-white rounded-full">
            {product.category}
          </span>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-brand-navy mb-2 group-hover:text-brand-green transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-brand-navy/60 mb-6 line-clamp-2 leading-relaxed">
          {product.shortDescription}
        </p>
        
        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-brand-navy/30 uppercase">Prix</span>
            <span className="text-lg font-extrabold text-brand-navy">
              {product.price.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <Link to={`/shop/${product.id}`}>
            <Button variant="secondary" size="sm" className="rounded-xl px-4">
              Voir le produit
              <ArrowRight size={14} className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
