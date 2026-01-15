
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Article } from '../types';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseAnonKey = 'sb_publishable_36McnPdKx5T7gEKzeMQYDQ_o44rEiYJ';
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
    addLog("Iniciando Protocolo de Curadoria (PT-BR)...");
    const themesList = themes.split('\n').filter(t => t.trim() !== '');

    try {
      addLog("Solicitando geração de rascunhos e imagens...");
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
      addLog(`Sucesso: ${newArticles.length} rascunhos aguardando revisão.`);
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
    const updatedDrafts = drafts.map(d => d.id === editingArticle.id ? editingArticle : d);
    setDrafts(updatedDrafts);
    localStorage.setItem('cmb_drafts', JSON.stringify(updatedDrafts));
    setEditingArticle(null);
    addLog("Alterações salvas e persistidas localmente.");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingArticle) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Erro: O arquivo excede o limite de 2MB.");
      return;
    }

    setIsUploading(true);
    addLog(`Enviando para Storage via Backend (Proxy Admin)...`);

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
        throw new Error(data.reason || data.error || "Falha crítica na autorização do storage.");
      }

      setEditingArticle({ 
        ...editingArticle, 
        image: data.image_url, 
        image_source: 'upload' 
      });
      
      addLog("SUCESSO: Imagem persistida com Service Role.");
      
    } catch (error: any) {
      console.error("ERRO DE UPLOAD:", error);
      addLog(`FALHA: ${error.message}`);
      alert(`Erro de Configuração Supabase:\n\n${error.message}\n\nIMPORTANTE: Se você já adicionou a chave na Vercel, você PRECISA fazer um REDEPLOY manual para que as mudanças entrem em vigor.`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const regenerateImage = async () => {
    if (!editingArticle) return;
    setIsRegeneratingImage(true);
    addLog("Regenerando imagem via IA...");
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
        addLog("Nova imagem persistida no storage.");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      addLog(`Erro na imagem: ${error.message}`);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const publishArticle = (id: string) => {
    if (editingArticle && editingArticle.id === id) {
      saveEdit();
    }
    
    const articleToPublish = drafts.find(d => d.id === id) || (editingArticle?.id === id ? editingArticle : null);
    if (!articleToPublish) return;

    const published = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    const newPublished = [{ ...articleToPublish, status: 'published' }, ...published];
    localStorage.setItem('cmb_published', JSON.stringify(newPublished));
    
    const remainingDrafts = drafts.filter(d => d.id !== id);
    setDrafts(remainingDrafts);
    localStorage.setItem('cmb_drafts', JSON.stringify(remainingDrafts));
    
    addLog("SUCESSO: Artigo publicado e imagem persistida.");
    alert("Publicado com sucesso!");
    if (editingArticle?.id === id) setEditingArticle(null);
  };

  const deleteDraft = (id: string) => {
    if (!confirm("Excluir este rascunho permanentemente?")) return;
    const remaining = drafts.filter(d => d.id !== id);
    setDrafts(remaining);
    localStorage.setItem('cmb_drafts', JSON.stringify(remaining));
  };

  if (isAuthenticated === null) return <div className="min-h-screen bg-brand-obsidian flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-obsidian px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-black text-brand-soft uppercase tracking-tighter mb-8 text-white">Terminal Editorial</h1>
          <form onSubmit={handleLogin} className="p-8 rounded-[2.5rem] bg-brand-graphite border border-brand-graphite shadow-2xl space-y-6">
            {loginError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">{loginError}</div>}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-brand-soft outline-none focus:border-brand-cyan" placeholder="E-mail" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-brand-soft outline-none focus:border-brand-cyan" placeholder="Senha" required />
            <button type="submit" disabled={isLoggingIn} className="w-full bg-brand-cyan text-brand-obsidian py-4 rounded-xl font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-xl shadow-brand-cyan/20">{isLoggingIn ? 'Autenticando...' : 'Acessar Terminal'}</button>
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
            <p className="text-brand-muted font-mono text-xs uppercase tracking-widest">Persistência Garantida via Backend (Service Role)</p>
          </div>
          <button onClick={handleLogout} className="px-6 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:border-red-500 transition-all">Sair</button>
        </div>

        {/* MODAL DE EDIÇÃO */}
        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 overflow-y-auto">
            <div className="bg-brand-graphite w-full max-w-4xl p-8 md:p-12 rounded-[3rem] border border-brand-graphite shadow-2xl space-y-8 my-8 relative">
              
              {isUploading && (
                <div className="absolute inset-0 bg-brand-obsidian/80 z-[110] flex flex-col items-center justify-center rounded-[3rem] backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-black text-xs uppercase tracking-widest text-brand-cyan animate-pulse text-center px-6">Bypass RLS: Salvando imagem definitiva...</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-cyan">Revisão Editorial</h2>
                  {editingArticle.image_source === 'upload' && (
                    <span className="text-[8px] bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded-full border border-brand-cyan/30 uppercase font-black tracking-widest">Persistência Garantida</span>
                  )}
                </div>
                <button onClick={() => setEditingArticle(null)} className="text-brand-muted hover:text-white transition-colors text-3xl">×</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Título do Post</label>
                    <input type="text" value={editingArticle.title} onChange={(e) => setEditingArticle({...editingArticle, title: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Subtítulo (Excerpt)</label>
                    <textarea value={editingArticle.excerpt} onChange={(e) => setEditingArticle({...editingArticle, excerpt: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan h-24" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Categoria</label>
                      <input type="text" value={editingArticle.category} onChange={(e) => setEditingArticle({...editingArticle, category: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Slug (URL)</label>
                      <input type="text" value={editingArticle.slug} onChange={(e) => setEditingArticle({...editingArticle, slug: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl overflow-hidden border border-brand-graphite h-52 bg-brand-obsidian relative group shadow-2xl">
                    <img src={editingArticle.image} className="w-full h-full object-cover" alt="Editor" />
                    <div className="absolute inset-0 bg-brand-obsidian/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4 p-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full max-w-[220px] bg-white text-brand-obsidian px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                      >
                        📤 Upload Manual
                      </button>
                      <button 
                        onClick={regenerateImage} 
                        disabled={isRegeneratingImage}
                        className="w-full max-w-[220px] bg-brand-cyan text-brand-obsidian px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                      >
                        {isRegeneratingImage ? 'Regenerando...' : '🔄 Regenerar via IA'}
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">URL Pública Persistente</label>
                    <input type="text" value={editingArticle.image} readOnly className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 text-brand-muted text-xs font-mono truncate cursor-not-allowed" />
                    <p className="text-[8px] mt-2 text-brand-cyan font-bold uppercase tracking-wider">🔒 Protegido via SUPABASE_SERVICE_ROLE_KEY (Server-side)</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Tags</label>
                    <input type="text" value={editingArticle.tags.join(', ')} onChange={(e) => setEditingArticle({...editingArticle, tags: e.target.value.split(',').map(t => t.trim())})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Conteúdo</label>
                <textarea 
                  value={editingArticle.content} 
                  onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} 
                  className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan h-64 font-mono text-sm leading-relaxed" 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-brand-graphite">
                <button onClick={saveEdit} className="flex-grow bg-brand-graphite border border-brand-graphite text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:border-brand-muted transition-all">Salvar Revisão</button>
                <button onClick={() => publishArticle(editingArticle.id)} className="flex-grow bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-2xl">Aprovar & Publicar</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 rounded-[2.5rem] bg-brand-graphite/40 border border-brand-graphite/50 shadow-xl">
              <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-brand-cyan mb-6">Fila de Geração</label>
              <textarea 
                value={themes}
                onChange={(e) => setThemes(e.target.value)}
                className="w-full bg-brand-obsidian border border-brand-graphite/50 rounded-2xl px-6 py-6 text-sm font-medium focus:border-brand-cyan outline-none transition-all placeholder:text-brand-muted/30"
                placeholder="Insira os temas estratégicos..."
                rows={3}
              />
              <button 
                onClick={generateDailyPosts} 
                disabled={isGenerating} 
                className={`w-full mt-6 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl ${isGenerating ? 'bg-brand-graphite cursor-not-allowed' : 'bg-brand-cyan text-brand-obsidian hover:scale-[1.01]'}`}
              >
                {isGenerating ? 'Processando Protocolo...' : 'Gerar Novos Rascunhos'}
              </button>
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 shadow-inner flex flex-col">
            <span className="mb-4 pb-2 border-b border-brand-graphite/30 uppercase font-black opacity-50 tracking-widest">Logs Operacionais</span>
            <div className="flex-grow overflow-y-auto max-h-[220px]">
              {logs.length === 0 ? '> Sistema pronto...' : logs.map((log, i) => <div key={i} className="mb-1 animate-fade-in">{log}</div>)}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <h2 className="text-2xl font-black uppercase tracking-widest text-white border-b border-brand-graphite pb-6">Aguardando Validação ({drafts.length})</h2>
          
          {drafts.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-brand-graphite rounded-[3rem] text-brand-muted italic opacity-50">Nenhum rascunho pendente de revisão física.</div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {drafts.map(draft => (
                <div key={draft.id} className="p-8 rounded-[3rem] bg-brand-graphite/20 border border-brand-graphite flex flex-col md:flex-row gap-10 hover:border-brand-cyan/40 transition-all group">
                  <div className="md:w-64 h-44 rounded-[2rem] overflow-hidden border border-brand-graphite shrink-0 bg-brand-obsidian relative">
                    <img src={draft.image} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform" alt="Preview" />
                    {draft.image_source === 'upload' && (
                      <div className="absolute bottom-4 right-4 bg-brand-cyan text-brand-obsidian px-2.5 py-1 rounded-full text-[7px] font-black uppercase tracking-widest shadow-xl">Persistente</div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-brand-purple font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20">{draft.category}</span>
                      <span className="text-brand-muted font-mono text-[10px]">{draft.date}</span>
                    </div>
                    <h3 className="text-2xl font-black mb-4 tracking-tighter text-white">{draft.title}</h3>
                    <p className="text-brand-muted text-sm line-clamp-2 mb-8">{draft.excerpt}</p>
                    <div className="flex flex-wrap gap-4">
                      <button onClick={() => startEditing(draft)} className="px-8 py-3.5 rounded-2xl bg-white text-brand-obsidian font-black text-[10px] uppercase tracking-widest hover:bg-brand-cyan transition-all">✏️ Revisar & Salvar</button>
                      <button onClick={() => publishArticle(draft.id)} className="px-8 py-3.5 rounded-2xl bg-brand-cyan text-brand-obsidian font-black text-[10px] uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-lg shadow-brand-cyan/10">🚀 Publicar</button>
                      <button onClick={() => deleteDraft(draft.id)} className="px-8 py-3.5 rounded-2xl border border-brand-graphite text-brand-muted font-black text-[10px] uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all">🗑️ Descartar</button>
                    </div>
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
