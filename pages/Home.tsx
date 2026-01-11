
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ARTICLES as STATIC_ARTICLES } from '../data/articles';
import ArticleCard from '../components/ArticleCard';
import { Article } from '../types';

const Home: React.FC = () => {
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  useEffect(() => {
    const publishedDrafts = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    // Unir artigos estáticos com os gerados e aprovados
    const combined = [...STATIC_ARTICLES, ...publishedDrafts].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setAllArticles(combined);
  }, []);

  const featured = allArticles[0] || STATIC_ARTICLES[0];
  const others = allArticles.slice(1);

  const scrollToArticles = () => {
    const el = document.getElementById('protocolos');
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
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
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
                onClick={scrollToArticles}
                className="group w-full sm:w-auto bg-brand-cyan text-brand-obsidian px-14 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-brand-purple hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl shadow-brand-cyan/20"
              >
                Ver Insights Recentes
                <span className="inline-block ml-3 group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <Link to="/sobre" className="w-full sm:w-auto bg-transparent border-2 px-14 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all dark:text-brand-soft dark:border-brand-graphite dark:hover:bg-brand-graphite text-slate-900 border-slate-200 hover:bg-slate-50 flex items-center justify-center">
                Quem Somos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Destaque Principal */}
      {featured && (
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
                    <div className="flex items-center space-x-5">
                      <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-brand-purple to-brand-cyan p-[2px]">
                        <div className="w-full h-full rounded-[1.2rem] flex items-center justify-center dark:bg-brand-graphite bg-white">
                          <span className="font-black text-xl dark:text-white text-brand-purple">C</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] mt-2 uppercase tracking-widest font-bold tracking-[0.2em] dark:text-brand-muted text-slate-400">{featured.date}</p>
                      </div>
                    </div>
                    <Link to={`/artigo/${featured.slug}`} className="bg-brand-purple text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-cyan hover:text-brand-obsidian transition-all text-center">
                      Ler Artigo
                    </Link>
                  </div>
                </div>
             </div>
          </div>
        </section>
      )}

      {/* Grid de Conteúdo */}
      <section id="protocolos" className="container mx-auto px-4 md:px-6 mt-40">
        <div className="flex flex-col md:flex-row items-end justify-between mb-20 space-y-6 md:space-y-0">
          <div className="max-w-xl">
            <h2 className="text-5xl font-black tracking-tighter uppercase mb-6 dark:text-brand-soft text-slate-900">Últimos <span className="text-brand-cyan">Protocolos.</span></h2>
            <p className="text-lg font-medium dark:text-brand-muted text-slate-500">Curadoria exclusiva dos artigos mais impactantes da semana no blogcmbdigital.</p>
          </div>
          <div className="flex items-center space-x-6 text-[10px] font-black uppercase tracking-[0.3em] px-8 py-3 rounded-full border dark:text-brand-muted dark:bg-brand-graphite/50 dark:border-brand-graphite text-slate-400 bg-white border-slate-200">
             <span>Base de Conhecimento Dinâmica</span>
             <span className="w-1.5 h-1.5 bg-brand-cyan rounded-full"></span>
             <span>Atualização Tempo Real</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
          {others.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
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
