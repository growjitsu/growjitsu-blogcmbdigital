
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ARTICLES as STATIC_ARTICLES } from '../data/articles';
import ArticleCard from '../components/ArticleCard';
import { Article } from '../types';

const ITEMS_PER_PAGE = 15;

const Home: React.FC = () => {
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const publishedDrafts = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    // Unir artigos estáticos com os gerados e aprovados
    // Garantimos que a data seja tratada corretamente para ordenação
    const combined = [...STATIC_ARTICLES, ...publishedDrafts].sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
    setAllArticles(combined);
  }, []);

  // Lógica de Busca
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

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
  const currentArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  // Resetar para página 1 ao buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const featured = allArticles[0] || STATIC_ARTICLES[0];

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
      {/* Hero Section */}
      <section className="pt-32 pb-48 relative overflow-hidden border-b dark:bg-brand-obsidian dark:border-brand-graphite/30 bg-white border-slate-100">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center space-x-3 px-5 py-2 rounded-full mb-10 shadow-xl dark:bg-brand-graphite dark:border-brand-graphite bg-slate-50 border border-slate-200">
              <span className="flex h-2 w-2 rounded-full bg-brand-cyan animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] dark:text-brand-soft text-slate-600">Status: Inteligência Ativa</span>
            </div>
            
            <h1 className="text-6xl md:text-9xl font-black mb-12 tracking-tighter leading-[0.85] dark:text-brand-soft text-slate-900">
              O Hub da <br/> 
              <span className="text-brand-cyan font-serif italic font-light lowercase">autoridade digital.</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-16 leading-relaxed max-w-2xl mx-auto font-medium tracking-tight dark:text-brand-muted text-slate-500">
              Análises profundas, guias de alta performance e as estratégias que definem a nova fronteira tecnológica no Brasil.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-5 sm:space-y-0 sm:space-x-8">
              <button 
                onClick={() => scrollToSection('protocolos')}
                className="group w-full sm:w-auto bg-brand-cyan text-brand-obsidian px-14 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-brand-purple hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl shadow-brand-cyan/20"
              >
                Ver Insights Recentes
                <span className="inline-block ml-3 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Destaque Principal (Somente na página 1 e sem busca) */}
      {featured && currentPage === 1 && !searchQuery && (
        <section className="container mx-auto px-4 md:px-6 -mt-32 relative z-20">
          <div className="max-w-6xl mx-auto">
             <div className="rounded-[4rem] shadow-2xl overflow-hidden flex flex-col lg:flex-row border transition-all duration-700 dark:bg-brand-graphite dark:border-brand-graphite group dark:hover:border-brand-cyan/30 bg-white border-slate-200 hover:border-brand-purple/30">
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
                    Leitura Obrigatória
                  </span>
                  
                  <h2 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1] tracking-tighter dark:text-brand-soft text-slate-900">
                    <Link to={`/artigo/${featured.slug}`} className="hover:text-brand-cyan transition-colors">
                      {featured.title}
                    </Link>
                  </h2>
                  
                  <p className="text-xl mb-12 leading-relaxed font-medium dark:text-brand-muted text-slate-600">
                    {featured.excerpt}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-10">
                    <Link to={`/artigo/${featured.slug}`} className="bg-brand-purple text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-cyan hover:text-brand-obsidian transition-all text-center">
                      Ler Artigo
                    </Link>
                  </div>
                </div>
             </div>
          </div>
        </section>
      )}

      {/* Grid de Conteúdo + Busca + Paginação */}
      <section id="protocolos" className="container mx-auto px-4 md:px-6 mt-40">
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
          <div className="max-w-xl w-full">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-4 dark:text-brand-soft text-slate-900">
              Explorar <span className="text-brand-cyan">Insights.</span>
            </h2>
            <div className="relative group">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por título, categoria ou tema..."
                className="w-full bg-brand-graphite/30 border border-brand-graphite/50 rounded-2xl px-14 py-5 text-sm font-medium focus:border-brand-cyan outline-none transition-all placeholder:text-brand-muted/50 dark:text-brand-soft text-slate-900"
              />
              <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-soft transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-6 text-[10px] font-black uppercase tracking-[0.3em] px-8 py-3 rounded-full border dark:text-brand-muted dark:bg-brand-graphite/50 dark:border-brand-graphite text-slate-400 bg-white border-slate-200">
             <span>Base de Conhecimento</span>
             <span className="w-1.5 h-1.5 bg-brand-cyan rounded-full"></span>
             <span>Página {currentPage} de {totalPages || 1}</span>
          </div>
        </div>

        {currentArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
              {currentArticles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* Navegação de Paginação */}
            {totalPages > 1 && (
              <div className="mt-24 flex flex-wrap justify-center items-center gap-3">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentPage === 1 ? 'opacity-30 cursor-not-allowed border border-brand-graphite' : 'bg-brand-graphite/50 hover:bg-brand-cyan hover:text-brand-obsidian border border-brand-graphite'}`}
                >
                  Anterior
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-12 h-12 rounded-xl font-black text-xs transition-all border ${currentPage === page ? 'bg-brand-cyan text-brand-obsidian border-brand-cyan shadow-lg shadow-brand-cyan/20' : 'bg-brand-graphite/20 border-brand-graphite/50 hover:border-brand-cyan text-brand-muted hover:text-brand-soft'}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed border border-brand-graphite' : 'bg-brand-graphite/50 hover:bg-brand-cyan hover:text-brand-obsidian border border-brand-graphite'}`}
                >
                  Próximo
                </button>
                
                <button 
                  onClick={() => setCurrentPage(totalPages)}
                  className="hidden sm:block px-6 py-4 rounded-xl font-black text-[10px] border border-brand-graphite uppercase tracking-widest text-brand-muted hover:text-brand-soft transition-all"
                >
                  Última ({totalPages})
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-40 text-center border-2 border-dashed border-brand-graphite/30 rounded-[4rem]">
            <h3 className="text-2xl font-black uppercase text-brand-muted mb-4 tracking-tighter">Nenhum insight localizado.</h3>
            <p className="text-brand-muted/60 font-medium">Tente buscar por termos diferentes ou navegue por nossas categorias principais.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-8 text-brand-cyan font-black uppercase tracking-widest text-[10px] border-b border-brand-cyan/30 pb-1"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="container mx-auto px-4 md:px-6 mt-48">
        <div className="rounded-[5rem] p-12 md:p-32 relative overflow-hidden border shadow-2xl dark:bg-brand-graphite dark:border-brand-graphite bg-white border-slate-100">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <div className="inline-block px-5 py-2 bg-brand-amber/10 border border-brand-amber/20 rounded-full mb-10 text-brand-amber text-[10px] font-black uppercase tracking-[0.4em] animate-amber-glow">
              Estratégia & Insights
            </div>
            
            <h2 className="text-5xl md:text-8xl font-black mb-12 tracking-tighter leading-[0.9] dark:text-brand-soft text-slate-900">Atualize seu <br/> <span className="text-brand-cyan">DNS Digital.</span></h2>
            
            <p className="text-2xl mb-16 leading-relaxed font-medium max-w-2xl mx-auto tracking-tight dark:text-brand-muted text-slate-600">
              A newsletter que separa o sinal do ruído. Receba insights semanais sobre IA e performance diretamente no seu e-mail.
            </p>
            
            <form className="flex flex-col md:flex-row gap-6 max-w-3xl mx-auto" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Seu melhor e-mail corporativo" 
                className="flex-grow border rounded-3xl px-10 py-6 focus:outline-none focus:ring-2 focus:ring-brand-cyan font-bold tracking-tight text-lg dark:bg-brand-obsidian dark:border-brand-graphite dark:text-brand-soft dark:placeholder-brand-muted bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
              />
              <button className="bg-brand-amber px-16 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] text-brand-obsidian hover:bg-white hover:scale-105 transition-all shadow-2xl shadow-brand-amber/30">
                Inscrever Agora
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
