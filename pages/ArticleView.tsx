
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Article } from '../types';

const ArticleView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    fetchArticle();
    window.scrollTo(0, 0);
    const updateProgress = () => {
      const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / scrollTotal) * 100;
      setReadingProgress(progress);
    };
    window.addEventListener('scroll', updateProgress);
    return () => window.removeEventListener('scroll', updateProgress);
  }, [slug]);

  const fetchArticle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/posts?slug=${slug}`);
      const data = await response.json();
      if (data.success) {
        setArticle(data.article);
      }
    } catch (err) {
      console.error("Erro ao carregar artigo da nuvem:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-40 text-center min-h-screen dark:bg-brand-obsidian">
        <div className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-32 text-center min-h-screen dark:bg-brand-obsidian dark:text-brand-soft">
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
          <span className="text-brand-cyan flex items-center">Insights Validados</span>
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
