import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Product } from '../data/products';
import { productService } from '../lib/productService';
import { Button } from '../components/ui/Button';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Zap, 
  Download,
  Info,
  BookOpen
} from 'lucide-react';

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [catalog, setCatalog] = useState<Product[]>(() => productService.getProductsSync());

  useEffect(() => {
    productService.getProducts().then(setCatalog).catch(() => {});
  }, []);
  
  const product = useMemo(() => {
    return catalog.find(p => p.id === id);
  }, [catalog, id]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-grey px-6 text-center">
        <div>
          <h2 className="text-3xl font-bold text-brand-navy mb-4">Produit non trouvé</h2>
          <p className="text-brand-navy/60 mb-8">Désolé, le produit que vous recherchez n'existe pas ou a été déplacé.</p>
          <Link to="/shop">
            <Button variant="primary">Retour à la boutique</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-grey min-h-screen pb-20">
      {/* 1. BREADCRUMBS & NAVIGATION */}
      <div className="pt-32 pb-8 px-6">
        <div className="mx-auto max-w-7xl">
          <Link to="/shop" className="inline-flex items-center gap-2 text-brand-navy/50 hover:text-brand-green font-bold text-xs uppercase tracking-widest transition-colors">
            <ChevronLeft size={16} />
            Retour à la boutique
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* 2. PRODUCT IMAGE / PREVIEW */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="sticky top-32">
              <div className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-white shadow-2xl border border-white/50">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-6 right-6">
                  <div className="bg-brand-green text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">
                    {product.format}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-6 bg-brand-navy rounded-3xl text-white flex items-center gap-6">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-brand-green">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-1">Paiement Sécurisé</h4>
                  <p className="text-xs text-brand-grey/60">Paiement manuel sécurisé via T-Money &amp; Moov Money</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 3. PRODUCT INFO */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="mb-10">
              <span className="inline-block px-4 py-1 bg-brand-green/10 text-brand-green rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                {product.category}
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-brand-navy mb-6 tracking-tight break-words leading-tight">
                {product.name}
              </h1>
              <p className="text-2xl font-black text-brand-green mb-8">
                {product.price.toLocaleString('fr-FR')} FCFA
              </p>
              <div className="h-px w-full bg-brand-navy/5 mb-8"></div>
              <p className="text-base sm:text-lg text-brand-navy/70 leading-relaxed italic">
                {product.fullDescription}
              </p>
            </div>

            {/* WHAT YOU WILL LEARN */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-brand-navy mb-6 uppercase flex items-center gap-3">
                <BookOpen size={20} className="text-brand-green" />
                Ce que vous allez apprendre
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {product.whatWillYouLearn.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-brand-grey">
                    <CheckCircle2 size={18} className="text-brand-green shrink-0 mt-0.5" />
                    <span className="text-sm text-brand-navy font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ADVANTAGES */}
            <div className="mb-12">
              <h3 className="text-xl font-bold text-brand-navy mb-6 uppercase flex items-center gap-3">
                <Zap size={20} className="text-brand-green" />
                Les avantages du produit
              </h3>
              <ul className="space-y-4">
                {product.advantages.map((adv, i) => (
                  <li key={i} className="flex items-center gap-4 text-brand-navy/70">
                    <div className="h-2 w-2 rounded-full bg-brand-green"></div>
                    <span className="text-sm font-medium">{adv}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA SECTION */}
            <div className="p-8 bg-white rounded-[2rem] border border-brand-grey shadow-xl shadow-brand-navy/5">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-xs font-bold text-brand-navy/30 uppercase mb-1">Format de fichier</p>
                  <p className="font-bold text-brand-navy flex items-center gap-2">
                    <FileText size={16} className="text-brand-green" />
                    Numérique ({product.format})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-brand-navy/30 uppercase mb-1">Validation</p>
                  <p className="font-bold text-brand-navy text-xs sm:text-sm">Vérification manuelle</p>
                </div>
              </div>
              
              <Link to={`/checkout?product=${product.id}`}>
                <Button variant="secondary" size="lg" className="w-full h-16 text-lg font-bold shadow-lg shadow-brand-green/20">
                  Acheter ce produit
                  <Download size={20} className="ml-3" />
                </Button>
              </Link>
              
              <p className="mt-6 text-[10px] text-center text-brand-navy/40 flex items-center justify-center gap-2">
                <Info size={12} />
                Paiement manuel sécurisé via T-Money (Togocom) ou Moov Money (Togo).
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
