
import React from 'react';
import { Link } from 'react-router-dom';
import { Article } from '../types';

interface ArticleCardProps {
  article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  return (
    <article className="group relative rounded-[2rem] overflow-hidden border transition-all duration-500 hover:shadow-2xl dark:bg-brand-graphite dark:border-brand-graphite dark:hover:border-brand-purple/50 bg-white border-slate-200 hover:border-brand-purple/30">
      {/* Glow Effect (Somente Dark) */}
      <div className="absolute -inset-1 bg-gradient-to-r from-brand-cyan/0 via-brand-purple/20 to-brand-cyan/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 pointer-events-none hidden dark:block"></div>
      
      <Link to={`/artigo/${article.slug}`} className="relative block h-full">
        <div className="relative h-64 overflow-hidden">
          <img 
            src={article.image} 
            alt={article.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80"></div>
          <div className="absolute top-6 left-6">
            <span className="bg-brand-purple/90 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-[0.25em] px-4 py-1.5 rounded-full shadow-2xl border border-white/10">
              {article.category}
            </span>
          </div>
        </div>
        
        <div className="p-8 pb-10">
          <div className="flex items-center text-[10px] mb-5 uppercase tracking-[0.2em] font-bold dark:text-brand-muted text-slate-500">
            <span className="text-brand-cyan">{article.date}</span>
          </div>
          
          <h3 className="text-xl md:text-2xl font-bold mb-4 group-hover:text-brand-cyan transition-colors line-clamp-2 leading-[1.3] tracking-tight dark:text-brand-soft text-slate-900">
            {article.title}
          </h3>
          
          <p className="text-sm line-clamp-3 leading-relaxed mb-8 font-medium dark:text-brand-muted text-slate-600">
            {article.excerpt}
          </p>
          
          <div className="flex items-center text-brand-cyan font-black text-[10px] uppercase tracking-[0.25em] group-hover:translate-x-2 transition-transform duration-300">
            Acessar Insights
            <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default ArticleCard;
