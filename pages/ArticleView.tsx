
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ARTICLES as STATIC_ARTICLES } from '../data/articles';
import { Article } from '../types';

const ArticleView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    const publishedDrafts = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    const allArticles = [...STATIC_ARTICLES, ...publishedDrafts];
    const found = allArticles.find(a => a.slug === slug);
    if (found) setArticle(found);
    
    window.scrollTo(0, 0);
    const updateProgress = () => {
      const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / scrollTotal) * 100;
      setReadingProgress(progress);
    };
    window.addEventListener('scroll', updateProgress);
    return () => window.removeEventListener('scroll', updateProgress);
  }, [slug]);

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-32 text-center min-h-screen dark:bg-brand-obsidian dark:text-brand-soft bg-brand-lightBg text-slate-900">
        <h1 className="text-4xl font-black uppercase tracking-tighter">Protocolo não localizado.</h1>
        <Link to="/" className="text-brand-cyan mt-8 inline-block font-black uppercase tracking-widest text-xs">Retornar ao Hub</Link>
      </div>
    );
  }

  return (
    <article className="pb-40 transition-colors duration-300 dark:bg-brand-obsidian bg-brand-lightBg">
      {/* Barra de Progresso de Leitura */}
      <div className="fixed top-20 left-0 w-full h-[3px] z-[60] dark:bg-brand-graphite bg-slate-200">
        <div 
          className="h-full bg-brand-cyan shadow-[0_0_10px_#00E5FF] transition-all duration-150 ease-out" 
          style={{ width: `${readingProgress}%` }}
        ></div>
      </div>

      {/* Cabeçalho do Artigo */}
      <header className="container mx-auto px-4 md:px-6 pt-32 pb-20 text-center max-w-5xl">
        <div className="flex justify-center mb-12">
          <span className="bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-black text-[10px] uppercase tracking-[0.5em] px-8 py-2.5 rounded-full backdrop-blur-sm">
            {article.category}
          </span>
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.95] mb-14 dark:text-brand-soft text-slate-900">
          {article.title}
        </h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-10 font-bold uppercase tracking-[0.3em] text-[10px] dark:text-brand-muted text-slate-500">
          <span>{article.date}</span>
          <span className="hidden sm:block w-2 h-2 rounded-full dark:bg-brand-graphite bg-slate-200"></span>
          <span className="text-brand-cyan flex items-center">
             <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/></svg>
             Insights Validados
          </span>
        </div>
      </header>

      {/* Banner Principal */}
      <div className="container mx-auto px-4 md:px-6 max-w-7xl mb-32">
        <div className="rounded-[4rem] overflow-hidden shadow-2xl border dark:border-brand-graphite border-slate-200 group">
          <img 
            src={article.image} 
            alt={article.title} 
            className="w-full h-auto max-h-[800px] object-cover group-hover:scale-105 transition-transform duration-[3s]" 
          />
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 flex flex-col lg:flex-row gap-24 max-w-7xl">
        <aside className="lg:w-24 hidden lg:flex flex-col items-center space-y-12 sticky top-48 h-fit">
          <p className="text-[9px] font-black uppercase tracking-[0.6em] rotate-90 mb-14 whitespace-nowrap dark:text-brand-muted text-slate-400">Broadcast Insight</p>
          <div className="flex flex-col space-y-6">
            <button className="w-16 h-16 rounded-[1.5rem] border flex items-center justify-center transition-all shadow-xl group dark:border-brand-graphite dark:text-brand-muted dark:hover:text-brand-cyan dark:hover:bg-brand-graphite bg-white border-slate-200 text-slate-400 hover:text-brand-purple hover:bg-slate-50">
               <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </button>
          </div>
        </aside>

        <div className="flex-grow max-w-4xl article-content mx-auto lg:mx-0">
          <div className="mb-20">
             <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>
          
          <div className="mt-24 pt-20 border-t dark:border-brand-graphite border-slate-200">
             <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-purple mb-10">Tags Contextuais</h4>
             <div className="flex flex-wrap gap-4">
               {article.tags.map(tag => (
                 <span key={tag} className="text-[10px] font-black px-8 py-3 rounded-2xl border transition-all cursor-default dark:bg-brand-graphite dark:text-brand-muted dark:border-brand-graphite dark:hover:border-brand-cyan/40 dark:hover:text-brand-cyan bg-white text-slate-500 border-slate-200 hover:border-brand-purple hover:text-brand-purple">#{tag.toUpperCase()}</span>
               ))}
             </div>
          </div>
        </div>

        <aside className="lg:w-96 hidden xl:block space-y-20 h-fit sticky top-48">
          <div className="p-12 rounded-[4rem] shadow-2xl border group transition-all dark:bg-gradient-to-br dark:from-brand-purple dark:to-indigo-900 dark:border-white/10 bg-brand-purple text-white border-brand-purple hover:scale-[1.02]">
            <h3 className="text-3xl font-black mb-6 tracking-tighter leading-tight text-white">Estratégia Digital</h3>
            <p className="mb-10 leading-relaxed font-medium text-lg text-white/80">Otimize sua autoridade com nossos protocolos semanais de curadoria.</p>
            <button className="w-full bg-white text-brand-purple py-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-brand-cyan hover:text-brand-obsidian transition-all transform hover:-translate-y-1 shadow-2xl">
              Saber Mais
            </button>
          </div>
        </aside>
      </div>
    </article>
  );
};

export default ArticleView;
