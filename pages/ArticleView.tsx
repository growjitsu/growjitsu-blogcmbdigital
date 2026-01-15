
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ARTICLES as STATIC_ARTICLES } from '../data/articles';
import { Article } from '../types';

const ArticleView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    // Busca unificada igual à Home
    const publishedInStorage = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    const storageSlugs = new Set(publishedInStorage.map((a: Article) => a.slug));
    const filteredStatic = STATIC_ARTICLES.filter(a => !storageSlugs.has(a.slug));
    const allArticles = [...publishedInStorage, ...filteredStatic];

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
      <div className="fixed top-20 left-0 w-full h-[3px] z-[60] dark:bg-brand-graphite bg-slate-200">
        <div className="h-full bg-brand-cyan shadow-[0_0_10px_#00E5FF] transition-all duration-150 ease-out" style={{ width: `${readingProgress}%` }}></div>
      </div>

      <header className="container mx-auto px-4 md:px-6 pt-32 pb-20 text-center max-w-5xl">
        <div className="flex justify-center mb-12">
          <span className="bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-black text-[10px] uppercase tracking-[0.5em] px-8 py-2.5 rounded-full backdrop-blur-sm">
            {article.category}
          </span>
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.95] mb-14 dark:text-brand-soft text-slate-900">{article.title}</h1>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-10 font-bold uppercase tracking-[0.3em] text-[10px] dark:text-brand-muted text-slate-500">
          <span>{article.date}</span>
          <span className="text-brand-cyan flex items-center">
             <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/></svg>
             Insights Validados
          </span>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-6 max-w-7xl mb-32">
        <div className="rounded-[4rem] overflow-hidden shadow-2xl border dark:border-brand-graphite border-slate-200 group">
          <img src={article.image} alt={article.title} className="w-full h-auto max-h-[800px] object-cover group-hover:scale-105 transition-transform duration-[3s]" />
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 flex flex-col lg:flex-row gap-24 max-w-7xl">
        <div className="flex-grow max-w-4xl article-content mx-auto lg:mx-0">
          <div className="mb-20">
             <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>
          <div className="mt-24 pt-20 border-t dark:border-brand-graphite border-slate-200">
             <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-purple mb-10">Tags Contextuais</h4>
             <div className="flex flex-wrap gap-4">
               {article.tags.map(tag => (
                 <span key={tag} className="text-[10px] font-black px-8 py-3 rounded-2xl border transition-all dark:bg-brand-graphite dark:text-brand-muted dark:border-brand-graphite dark:hover:text-brand-cyan">#{tag.toUpperCase()}</span>
               ))}
             </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ArticleView;
