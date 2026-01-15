
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ARTICLES as STATIC_ARTICLES } from '../data/articles';
import ArticleCard from '../components/ArticleCard';
import { Article } from '../types';

const ITEMS_PER_PAGE = 15;

// Helper para converter data PT-BR em objeto Date comparável
const parseDate = (dateStr: string) => {
  const months: { [key: string]: number } = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  
  const cleanStr = dateStr.toLowerCase().replace(' de ', ' ');
  const parts = cleanStr.split(' ');
  
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = months[parts[1].replace(',', '')];
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  return new Date(dateStr); // Fallback para ISO
};

const Home: React.FC = () => {
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // 1. Unificação: Pegar publicados do storage
    const publishedInStorage = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    
    // 2. Mesclagem: Filtrar estáticos que já foram "sobrescritos" no storage (baseado no slug)
    const storageSlugs = new Set(publishedInStorage.map((a: Article) => a.slug));
    const filteredStatic = STATIC_ARTICLES.filter(a => !storageSlugs.has(a.slug));
    
    // 3. Unir e Ordenar (Mais novos primeiro)
    const combined = [...publishedInStorage, ...filteredStatic].sort((a, b) => {
      const dateA = parseDate(a.date).getTime();
      const dateB = parseDate(b.date).getTime();
      return dateB - dateA;
    });

    setAllArticles(combined);
  }, []);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return allArticles;

    return allArticles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.excerpt.toLowerCase().includes(query) ||
      article.category.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [allArticles, searchQuery]);

  // Paginação
  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
  const currentArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  // Destaque Dinâmico: Sempre o post mais recente do array ordenado
  const featured = allArticles[0];

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -100;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="transition-colors duration-300 dark:bg-brand-obsidian bg-brand-lightBg pb-32">
      <section className="pt-32 pb-48 relative overflow-hidden border-b dark:bg-brand-obsidian dark:border-brand-graphite/30 bg-white border-slate-100">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <div className="inline-flex items-center space-x-3 px-5 py-2 rounded-full mb-10 shadow-xl dark:bg-brand-graphite dark:border-brand-graphite bg-slate-50 border border-slate-200">
            <span className="flex h-2 w-2 rounded-full bg-brand-cyan animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] dark:text-brand-soft text-slate-600">Sincronização em Tempo Real Ativa</span>
          </div>
          <h1 className="text-6xl md:text-9xl font-black mb-12 tracking-tighter leading-[0.85] dark:text-brand-soft text-slate-900">
            O Hub da <br/> <span className="text-brand-cyan font-serif italic font-light lowercase">autoridade digital.</span>
          </h1>
          <button onClick={() => scrollToSection('protocolos')} className="group bg-brand-cyan text-brand-obsidian px-14 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-brand-purple hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl">
            Ver Insights Recentes
          </button>
        </div>
      </section>

      {/* Destaque Atual Inteligente: Sempre o primeiro post do feed ordenado */}
      {featured && currentPage === 1 && !searchQuery && (
        <section className="container mx-auto px-4 md:px-6 -mt-32 relative z-20">
          <div className="max-w-6xl mx-auto">
             <div className="rounded-[4rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border transition-all duration-700 dark:bg-brand-graphite dark:border-brand-graphite group bg-white border-slate-200 hover:border-brand-purple/30">
                <div className="lg:w-1/2 relative overflow-hidden">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover min-h-[500px] group-hover:scale-105 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute top-10 left-10">
                     <div className="bg-brand-obsidian/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.4em] text-white">Destaque Atual</div>
                  </div>
                </div>
                <div className="lg:w-1/2 p-12 md:p-20 flex flex-col justify-center">
                  <span className="text-brand-cyan font-black text-[10px] uppercase tracking-[0.5em] mb-8 flex items-center">
                    <span className="w-10 h-px bg-brand-cyan mr-4"></span>
                    Postagem mais Recente
                  </span>
                  <h2 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1] tracking-tighter dark:text-brand-soft text-slate-900">
                    <Link to={`/artigo/${featured.slug}`} className="hover:text-brand-cyan transition-colors">{featured.title}</Link>
                  </h2>
                  <p className="text-xl mb-12 font-medium dark:text-brand-muted text-slate-600 line-clamp-3">{featured.excerpt}</p>
                  <Link to={`/artigo/${featured.slug}`} className="bg-brand-purple text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-cyan hover:text-brand-obsidian transition-all text-center self-start">Ler Artigo</Link>
                </div>
             </div>
          </div>
        </section>
      )}

      <section id="protocolos" className="container mx-auto px-4 md:px-6 mt-40">
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
          <div className="max-w-xl w-full">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-4 dark:text-brand-soft text-slate-900">Explorar <span className="text-brand-cyan">Insights.</span></h2>
            <div className="relative group">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Pesquisar..." className="w-full bg-brand-graphite/30 border border-brand-graphite/50 rounded-2xl px-14 py-5 text-sm font-medium focus:border-brand-cyan outline-none transition-all dark:text-brand-soft" />
              <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-[10px] font-black uppercase tracking-[0.3em] px-8 py-3 rounded-full border dark:text-brand-muted dark:bg-brand-graphite/50 dark:border-brand-graphite text-slate-400 bg-white border-slate-200">
             <span>Protocolos Ativos: {allArticles.length}</span>
             <span className="w-1.5 h-1.5 bg-brand-cyan rounded-full"></span>
             <span>Página {currentPage}</span>
          </div>
        </div>

        {currentArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
              {currentArticles.map(article => <ArticleCard key={article.id} article={article} />)}
            </div>
            {totalPages > 1 && (
              <div className="mt-24 flex justify-center items-center gap-3">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-6 py-4 rounded-xl font-black text-[10px] uppercase border dark:border-brand-graphite">Anterior</button>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-6 py-4 rounded-xl font-black text-[10px] uppercase bg-brand-cyan text-brand-obsidian">Próximo</button>
              </div>
            )}
          </>
        ) : (
          <div className="py-40 text-center border-2 border-dashed border-brand-graphite/30 rounded-[4rem]">
            <h3 className="text-2xl font-black text-brand-muted">Nenhum insight localizado.</h3>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
