
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Article } from '../types';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzc1ODYsImV4cCI6MjA4Mzc1MzU4Nn0.jJQpw4suKZof8caOsQ41PBOegESYqi-iLatK1qk4GzQ';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [themes, setThemes] = useState('');
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<Article[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    const savedDrafts = localStorage.getItem('cmb_drafts');
    if (savedDrafts) setDrafts(JSON.parse(savedDrafts));

    const savedPublished = localStorage.getItem('cmb_published');
    if (savedPublished) setPublishedArticles(JSON.parse(savedPublished));

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) throw new Error(error.message);
    } catch (error: any) {
      setLoginError(error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8));

  const generateDailyPosts = async () => {
    setIsGenerating(true);
    setLogs([]);
    addLog("Iniciando Protocolo de Curadoria...");
    const themesList = themes.split('\n').filter(t => t.trim() !== '');

    try {
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themes: themesList })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Erro no servidor.");

      const newArticles = data.articles || [];
      const updatedDrafts = [...newArticles, ...drafts];
      setDrafts(updatedDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(updatedDrafts));
      setThemes('');
      addLog(`Sucesso: ${newArticles.length} novos rascunhos.`);
    } catch (error: any) {
      addLog(`FALHA: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = (article: Article) => {
    setEditingArticle({ ...article });
  };

  const saveEdit = () => {
    if (!editingArticle) return;

    if (editingArticle.status === 'published') {
      // Atualizar lista de publicados
      const updated = publishedArticles.map(a => a.id === editingArticle.id ? editingArticle : a);
      setPublishedArticles(updated);
      localStorage.setItem('cmb_published', JSON.stringify(updated));
      addLog(`Post Publicado "${editingArticle.title}" atualizado com sucesso.`);
    } else {
      // Atualizar lista de rascunhos
      const updated = drafts.map(d => d.id === editingArticle.id ? editingArticle : d);
      setDrafts(updated);
      localStorage.setItem('cmb_drafts', JSON.stringify(updated));
      addLog(`Rascunho "${editingArticle.title}" atualizado.`);
    }

    setEditingArticle(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingArticle) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Erro: Limite de 2MB.");
      return;
    }

    setIsUploading(true);
    addLog(`Persistindo nova imagem via Service Role...`);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingArticle.slug || 'post'}-${Date.now()}.${fileExt}`;

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-file-name': fileName,
          'content-type': file.type,
        },
        body: file
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.reason || data.error || "Erro de permissão no Storage.");
      }

      setEditingArticle({ 
        ...editingArticle, 
        image: data.image_url, 
        image_source: 'upload' 
      });
      
      addLog("SUCESSO: Asset de imagem atualizado.");
      
    } catch (error: any) {
      addLog(`ERRO: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const regenerateImage = async () => {
    if (!editingArticle) return;
    setIsRegeneratingImage(true);
    addLog("Iniciando regeneração de imagem IA...");
    try {
      const response = await fetch('/api/curadoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'regenerate_image', 
          title: editingArticle.title,
          category: editingArticle.category
        })
      });
      const data = await response.json();
      if (data.success) {
        setEditingArticle({ 
          ...editingArticle, 
          image: data.image, 
          image_source: 'ai' 
        });
        addLog("Nova imagem IA persistida.");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      addLog(`Erro IA: ${error.message}`);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const publishArticle = (id: string) => {
    const isNewPublish = drafts.some(d => d.id === id);
    const articleToPublish = drafts.find(d => d.id === id) || publishedArticles.find(a => a.id === id) || (editingArticle?.id === id ? editingArticle : null);
    
    if (!articleToPublish) return;

    const publishedPost = { ...articleToPublish, status: 'published' as const };

    // Atualizar estado de publicados (Upsert)
    const exists = publishedArticles.some(a => a.id === id);
    const newPublished = exists 
      ? publishedArticles.map(a => a.id === id ? publishedPost : a)
      : [publishedPost, ...publishedArticles];

    setPublishedArticles(newPublished);
    localStorage.setItem('cmb_published', JSON.stringify(newPublished));
    
    // Remover de rascunhos se veio de lá
    if (isNewPublish) {
      const remainingDrafts = drafts.filter(d => d.id !== id);
      setDrafts(remainingDrafts);
      localStorage.setItem('cmb_drafts', JSON.stringify(remainingDrafts));
    }
    
    addLog(`STATUS: Post "${publishedPost.title}" está LIVE.`);
    setEditingArticle(null);
  };

  const unpublishArticle = (id: string) => {
    if (!confirm("Remover este post do ar e mover para rascunhos?")) return;
    const post = publishedArticles.find(a => a.id === id);
    if (!post) return;

    const draftPost = { ...post, status: 'draft' as const };
    
    setPublishedArticles(publishedArticles.filter(a => a.id !== id));
    localStorage.setItem('cmb_published', JSON.stringify(publishedArticles.filter(a => a.id !== id)));

    setDrafts([draftPost, ...drafts]);
    localStorage.setItem('cmb_drafts', JSON.stringify([draftPost, ...drafts]));

    addLog(`STATUS: Post "${post.title}" despublicado.`);
  };

  const deleteArticle = (id: string, from: 'draft' | 'published') => {
    if (!confirm(`Excluir permanentemente este ${from === 'draft' ? 'rascunho' : 'post'}?`)) return;
    
    if (from === 'draft') {
      const remaining = drafts.filter(d => d.id !== id);
      setDrafts(remaining);
      localStorage.setItem('cmb_drafts', JSON.stringify(remaining));
    } else {
      const remaining = publishedArticles.filter(a => a.id !== id);
      setPublishedArticles(remaining);
      localStorage.setItem('cmb_published', JSON.stringify(remaining));
    }
    addLog("Elemento deletado com sucesso.");
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-brand-obsidian flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-black text-brand-soft uppercase tracking-tighter mb-8 text-white">Terminal Editorial</h1>
          <form onSubmit={handleLogin} className="p-8 rounded-[2.5rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-6">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-brand-soft outline-none focus:border-brand-cyan" placeholder="E-mail" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-brand-soft outline-none focus:border-brand-cyan" placeholder="Senha" required />
            <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-4 rounded-xl font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-xl">{isLoggingIn ? 'Autenticando...' : 'Acessar Terminal'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-brand-obsidian text-brand-soft">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase mb-2 text-white">Motor <span className="text-brand-cyan">Editorial</span></h1>
            <p className="text-brand-muted font-mono text-xs uppercase tracking-widest">Controle de Ativos & SEO</p>
          </div>
          <button onClick={handleLogout} className="px-6 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:border-red-500 transition-all">Sair</button>
        </div>

        {/* MODAL DE EDIÇÃO AVANÇADA */}
        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto">
            <div className="bg-brand-graphite w-full max-w-5xl p-8 md:p-12 rounded-[3.5rem] border border-brand-graphite shadow-2xl space-y-8 my-8 relative">
              
              {isUploading && (
                <div className="absolute inset-0 bg-brand-obsidian/80 z-[110] flex flex-col items-center justify-center rounded-[3.5rem] backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-black text-xs uppercase tracking-widest text-brand-cyan animate-pulse">Sincronizando Asset no Storage...</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-cyan">Editor de Ativos</h2>
                  <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${editingArticle.status === 'published' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-brand-amber/10 border-brand-amber/20 text-brand-amber'}`}>
                    {editingArticle.status === 'published' ? '● Publicado' : '○ Rascunho'}
                  </span>
                </div>
                <button onClick={() => setEditingArticle(null)} className="text-brand-muted hover:text-white transition-colors text-3xl">×</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Título Editorial</label>
                    <input type="text" value={editingArticle.title} onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Slug (SEO - Permanente)</label>
                    <div className="relative group">
                      <input type="text" value={editingArticle.slug} onChange={(e) => setEditingArticle({...editingArticle, slug: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-amber font-mono text-xs" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] text-brand-amber opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black">Cuidado: Altera o Link</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Resumo (Excerpt)</label>
                    <textarea value={editingArticle.excerpt} onChange={(e) => setEditingArticle({...editingArticle, excerpt: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan h-24 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Categoria</label>
                      <input type="text" value={editingArticle.category} onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Autor</label>
                      <input type="text" value={editingArticle.author} readOnly className="w-full bg-brand-obsidian/50 border border-brand-graphite rounded-xl px-5 py-4 text-brand-muted cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-[2.5rem] overflow-hidden border border-brand-graphite h-64 bg-brand-obsidian relative group shadow-2xl">
                    <img src={editingArticle.image} className="w-full h-full object-cover" alt="Editor" />
                    <div className="absolute inset-0 bg-brand-obsidian/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4 p-4">
                      <button onClick={() => fileInputRef.current?.click()} className="w-full max-w-[240px] bg-white text-brand-obsidian px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">Substituir Imagem</button>
                      <button onClick={regenerateImage} disabled={isRegeneratingImage} className="w-full max-w-[240px] bg-brand-cyan text-brand-obsidian px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl">{isRegeneratingImage ? 'Gerando...' : 'Regenerar via IA'}</button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Meta Description (SEO)</label>
                    <textarea value={editingArticle.metaDescription} onChange={(e) => setEditingArticle({...editingArticle, metaDescription: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan h-20 text-xs" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Conteúdo do Artigo (HTML/MD)</label>
                <textarea value={editingArticle.content} onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-8 py-8 outline-none focus:border-brand-cyan h-80 font-mono text-sm leading-relaxed" />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-brand-graphite">
                <button onClick={saveEdit} className="flex-grow bg-brand-graphite border border-brand-graphite text-white py-6 rounded-2xl font-black uppercase tracking-widest hover:border-brand-muted transition-all">Salvar Alterações</button>
                <button onClick={() => publishArticle(editingArticle.id)} className="flex-grow bg-brand-cyan text-brand-obsidian py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-2xl">
                  {editingArticle.status === 'published' ? 'Atualizar Post Vivo' : 'Lançar no Hub'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-20">
          <div className="lg:col-span-2 p-8 rounded-[2.5rem] bg-brand-graphite/40 border border-brand-graphite/50 shadow-xl">
             <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-brand-cyan mb-6">Brainstorming & Automação</label>
            <textarea value={themes} onChange={(e) => setThemes(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite/50 rounded-2xl px-6 py-6 text-sm focus:border-brand-cyan outline-none" placeholder="Temas sugeridos..." rows={3} />
            <button onClick={generateDailyPosts} disabled={isGenerating} className="w-full mt-6 py-5 rounded-2xl font-black text-xs uppercase bg-brand-cyan text-brand-obsidian">{isGenerating ? 'Curadoria em Progresso...' : 'Gerar Novos Rascunhos'}</button>
          </div>
          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 overflow-y-auto max-h-[220px]">
            {logs.map((l, i) => <div key={i} className="mb-1 animate-pulse">{l}</div>)}
          </div>
        </div>

        {/* SEÇÃO: RASCUNHOS */}
        <div className="space-y-10 mb-24">
          <h2 className="text-2xl font-black uppercase tracking-widest text-white border-b border-brand-graphite pb-6">Aguardando Validação ({drafts.length})</h2>
          {drafts.length === 0 ? (
            <p className="text-brand-muted italic py-10">Nenhum rascunho pendente.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {drafts.map(draft => (
                <div key={draft.id} className="p-6 rounded-3xl bg-brand-graphite/20 border border-brand-graphite flex flex-col md:flex-row gap-8 items-center group">
                  <img src={draft.image} className="w-32 h-24 rounded-2xl object-cover bg-brand-obsidian group-hover:scale-105 transition-transform" />
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-lg font-black mb-1 text-white">{draft.title}</h3>
                    <p className="text-xs text-brand-muted">{draft.category} • {draft.date}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => startEditing(draft)} className="text-[9px] font-black uppercase bg-white text-brand-obsidian px-5 py-3 rounded-xl hover:bg-brand-cyan transition-all">Editar</button>
                    <button onClick={() => publishArticle(draft.id)} className="text-[9px] font-black uppercase bg-brand-cyan text-brand-obsidian px-5 py-3 rounded-xl hover:bg-brand-purple hover:text-white transition-all">Publicar</button>
                    <button onClick={() => deleteArticle(draft.id, 'draft')} className="text-[9px] font-black uppercase border border-brand-graphite text-brand-muted px-5 py-3 rounded-xl hover:border-red-500 hover:text-red-500">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEÇÃO: PUBLICADOS */}
        <div className="space-y-10">
          <h2 className="text-2xl font-black uppercase tracking-widest text-brand-cyan border-b border-brand-cyan/20 pb-6">Gestão de Ativos Publicados ({publishedArticles.length})</h2>
          {publishedArticles.length === 0 ? (
            <p className="text-brand-muted italic py-10">Nenhum post publicado no Hub ainda.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {publishedArticles.map(article => (
                <div key={article.id} className="p-6 rounded-3xl bg-brand-cyan/5 border border-brand-cyan/10 flex flex-col md:flex-row gap-8 items-center group">
                  <div className="relative">
                    <img src={article.image} className="w-32 h-24 rounded-2xl object-cover bg-brand-obsidian group-hover:opacity-80 transition-all" />
                    <span className="absolute -top-2 -right-2 bg-green-500 w-4 h-4 rounded-full border-4 border-brand-obsidian"></span>
                  </div>
                  <div className="flex-grow text-center md:text-left">
                    <h3 className="text-lg font-black mb-1 text-white">{article.title}</h3>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <p className="text-[9px] font-bold text-brand-cyan uppercase tracking-widest">{article.category}</p>
                      <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">Slug: {article.slug}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => startEditing(article)} className="text-[9px] font-black uppercase bg-brand-cyan text-brand-obsidian px-5 py-3 rounded-xl hover:scale-105 transition-all">✏️ Editar</button>
                    <button onClick={() => unpublishArticle(article.id)} className="text-[9px] font-black uppercase border border-brand-cyan/30 text-brand-cyan px-5 py-3 rounded-xl hover:bg-brand-cyan/10 transition-all">Despublicar</button>
                    <button onClick={() => deleteArticle(article.id, 'published')} className="text-[9px] font-black uppercase border border-brand-graphite text-brand-muted px-5 py-3 rounded-xl hover:border-red-500 hover:text-red-500">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
