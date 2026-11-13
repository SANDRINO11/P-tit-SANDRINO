import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Category, Product } from '../data/products';
import { productService } from '../lib/productService';
import { ProductCard } from '../components/shop/ProductCard';
import { Button } from '../components/ui/Button';
import { Search, SlidersHorizontal, ChevronDown, PackageX } from 'lucide-react';

const categories: (Category | 'Toutes')[] = [
  'Toutes',
  'Entrepreneuriat',
  'Développement personnel',
  'Bien-être',
  'Formation',
  'Guides pratiques'
];

export const Shop = () => {
  const [products, setProducts] = useState<Product[]>(() => productService.getProductsSync());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(Category | 'Toutes')>('Toutes');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest'>('newest');

  useEffect(() => {
    productService.getProducts().then(setProducts).catch(() => {});
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Toutes' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });
  }, [products, searchTerm, selectedCategory, sortBy]);

  return (
    <div className="bg-brand-grey min-h-screen">
      {/* 1. HERO / BANNER */}
      <section className="relative pt-32 pb-20 bg-brand-navy overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/src/assets/images/shop_banner_learning_resources_1794250357467.jpg" 
            alt="SANDRINO Shop Banner"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/80 to-transparent"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="text-brand-green font-bold tracking-[0.3em] uppercase text-sm mb-4 block">
              Boutique Numérique
            </span>
            <h1 className="text-3xl md:text-6xl font-extrabold text-white mb-8 tracking-tight uppercase text-balance max-w-2xl leading-tight">
              LA BOUTIQUE <span className="text-brand-green">SANDRINO</span>
            </h1>
            <p className="text-xl text-brand-grey/90 leading-relaxed mb-10">
              « Découvrez une sélection de ressources numériques conçues pour vous aider à apprendre, développer vos compétences et avancer dans vos projets personnels et professionnels. »
            </p>
            <Button variant="secondary" size="lg" className="px-10">
              Découvrir les produits
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 2. FILTERS & SEARCH */}
      <section className="sticky top-20 z-40 bg-white border-b border-brand-grey shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Search Bar */}
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30" size={18} />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-brand-grey border-none rounded-2xl text-brand-navy focus:ring-2 focus:ring-brand-green/20 transition-all outline-none"
              />
            </div>

            {/* Category Filter & Sort */}
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                        ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' 
                        : 'bg-brand-grey text-brand-navy/60 hover:bg-brand-grey/80'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="h-8 w-px bg-brand-grey hidden lg:block"></div>

              <div className="relative flex items-center gap-2 group ml-auto lg:ml-0">
                <SlidersHorizontal size={16} className="text-brand-navy/40" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-transparent text-xs font-bold text-brand-navy/70 outline-none pr-6 cursor-pointer"
                >
                  <option value="newest">Nouveautés</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix décroissant</option>
                </select>
                <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-brand-navy/40 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRODUCT GRID */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center text-brand-navy/20 mb-6">
                <PackageX size={40} />
              </div>
              <h2 className="text-2xl font-bold text-brand-navy mb-4">
                {searchTerm || selectedCategory !== 'Toutes' 
                  ? "Aucun produit ne correspond à votre recherche."
                  : "Nos produits numériques seront bientôt disponibles."}
              </h2>
              <p className="text-brand-navy/60 max-w-md mx-auto leading-relaxed">
                Revenez bientôt pour découvrir nos prochaines ressources et outils numériques conçus pour votre succès.
              </p>
              {(searchTerm || selectedCategory !== 'Toutes') && (
                <Button 
                  variant="outline" 
                  className="mt-8"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('Toutes');
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
