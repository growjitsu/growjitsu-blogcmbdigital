
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

  // Estado para Edição Manual
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
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
    addLog("Alterações salvas no rascunho.");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingArticle) return;

    // Validações
    if (file.size > 2 * 1024 * 1024) {
      alert("Arquivo muito grande. Limite: 2MB.");
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert("Formato não suportado. Use JPG, PNG ou WEBP.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      
      // Validação de Proporção (Opcional, mas solicitada no prompt)
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        const targetRatio = 16 / 9;
        const tolerance = 0.1;
        
        if (Math.abs(ratio - targetRatio) > tolerance) {
          if (!confirm("A imagem não está na proporção 16:9 recomendada (1200x675). Deseja continuar mesmo assim?")) {
            return;
          }
        }
        
        setEditingArticle({ 
          ...editingArticle, 
          image: base64, 
          image_source: 'upload' 
        });
        addLog("Upload manual concluído com sucesso.");
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const regenerateImage = async () => {
    if (!editingArticle) return;
    setIsRegeneratingImage(true);
    addLog("Regenerando imagem baseada no título atual...");
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
        addLog("Nova imagem gerada com sucesso.");
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
    const articleToPublish = drafts.find(d => d.id === id);
    if (!articleToPublish) return;
    const published = JSON.parse(localStorage.getItem('cmb_published') || '[]');
    localStorage.setItem('cmb_published', JSON.stringify([{ ...articleToPublish, status: 'published' }, ...published]));
    const remainingDrafts = drafts.filter(d => d.id !== id);
    setDrafts(remainingDrafts);
    localStorage.setItem('cmb_drafts', JSON.stringify(remainingDrafts));
    addLog("ARTIGO PUBLICADO NO HUB.");
    alert("Publicado com sucesso!");
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
            <p className="text-brand-muted font-mono text-xs uppercase tracking-widest">Controle Editorial Manual Ativado</p>
          </div>
          <button onClick={handleLogout} className="px-6 py-4 rounded-xl border border-brand-graphite text-xs font-bold uppercase hover:border-red-500 transition-all">Sair</button>
        </div>

        {/* MODAL DE EDIÇÃO */}
        {editingArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 overflow-y-auto">
            <div className="bg-brand-graphite w-full max-w-4xl p-8 md:p-12 rounded-[3rem] border border-brand-graphite shadow-2xl space-y-8 my-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-cyan">Modo de Revisão</h2>
                  {editingArticle.image_source === 'upload' && (
                    <span className="text-[8px] bg-brand-amber/20 text-brand-amber px-2 py-0.5 rounded-full border border-brand-amber/30 uppercase font-black tracking-widest">Upload Manual</span>
                  )}
                </div>
                <button onClick={() => setEditingArticle(null)} className="text-brand-muted hover:text-white transition-colors text-2xl">×</button>
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
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Slug</label>
                      <input type="text" value={editingArticle.slug} onChange={(e) => setEditingArticle({...editingArticle, slug: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl overflow-hidden border border-brand-graphite h-52 bg-brand-obsidian relative group shadow-inner">
                    <img src={editingArticle.image} className="w-full h-full object-cover" alt="Editor" />
                    <div className="absolute inset-0 bg-brand-obsidian/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4 p-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full max-w-[200px] bg-white text-brand-obsidian px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                      >
                        📤 Upload de Imagem
                      </button>
                      <button 
                        onClick={regenerateImage} 
                        disabled={isRegeneratingImage}
                        className="w-full max-w-[200px] bg-brand-cyan text-brand-obsidian px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                      >
                        {isRegeneratingImage ? 'Gerando...' : '🔄 Regenerar IA'}
                      </button>
                      <p className="text-[8px] text-brand-muted font-bold uppercase tracking-widest text-center">Recomendado: 1200x675 (16:9)</p>
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
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">URL da Imagem / Base64</label>
                    <input type="text" value={editingArticle.image} onChange={(e) => setEditingArticle({...editingArticle, image: e.target.value})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan text-xs font-mono truncate" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Tags (Separadas por vírgula)</label>
                    <input type="text" value={editingArticle.tags.join(', ')} onChange={(e) => setEditingArticle({...editingArticle, tags: e.target.value.split(',').map(t => t.trim())})} className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Conteúdo do Artigo (HTML/Markdown)</label>
                <textarea 
                  value={editingArticle.content} 
                  onChange={(e) => setEditingArticle({...editingArticle, content: e.target.value})} 
                  className="w-full bg-brand-obsidian border border-brand-graphite rounded-xl px-5 py-4 outline-none focus:border-brand-cyan h-72 font-mono text-sm leading-relaxed" 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-brand-graphite">
                <button onClick={saveEdit} className="flex-grow bg-brand-graphite border border-brand-graphite text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:border-brand-muted transition-all">Salvar Rascunho</button>
                <button onClick={() => publishArticle(editingArticle.id)} className="flex-grow bg-brand-cyan text-brand-obsidian py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all shadow-xl shadow-brand-cyan/20">Finalizar & Publicar</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 rounded-[2.5rem] bg-brand-graphite/40 border border-brand-graphite/50 shadow-xl">
              <label className="block text-[10px] font-black uppercase tracking-[0.4em] text-brand-cyan mb-6">Configuração de Temas</label>
              <textarea 
                value={themes}
                onChange={(e) => setThemes(e.target.value)}
                className="w-full bg-brand-obsidian border border-brand-graphite/50 rounded-2xl px-6 py-6 text-sm font-medium focus:border-brand-cyan outline-none transition-all placeholder:text-brand-muted/30"
                placeholder="Um tema por linha..."
                rows={4}
              />
              <button 
                onClick={generateDailyPosts} 
                disabled={isGenerating} 
                className={`w-full mt-8 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl ${isGenerating ? 'bg-brand-graphite cursor-not-allowed' : 'bg-brand-cyan text-brand-obsidian hover:scale-[1.02] shadow-brand-cyan/20'}`}
              >
                {isGenerating ? 'Executando Protocolo...' : 'Gerar Novos Rascunhos'}
              </button>
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-brand-graphite/50 font-mono text-[10px] text-brand-cyan/80 min-h-[250px] shadow-inner flex flex-col">
            <span className="mb-4 pb-2 border-b border-brand-graphite/30 uppercase font-black opacity-50 tracking-widest">Logs Editoriais</span>
            <div className="flex-grow overflow-y-auto max-h-[300px]">
              {logs.length === 0 ? '> Pronto para curadoria...' : logs.map((log, i) => <div key={i} className="mb-1 animate-fade-in">{log}</div>)}
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="flex items-center justify-between border-b border-brand-graphite pb-8">
            <h2 className="text-2xl font-black uppercase tracking-widest text-white">Fila de Revisão ({drafts.length})</h2>
          </div>
          {drafts.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-brand-graphite rounded-[3rem] text-brand-muted italic">Nenhum rascunho pendente de revisão.</div>
          ) : (
            <div className="grid grid-cols-1 gap-10">
              {drafts.map(draft => (
                <div key={draft.id} className="p-8 rounded-[3rem] bg-brand-graphite/20 border border-brand-graphite flex flex-col md:flex-row gap-10 hover:border-brand-cyan/40 transition-all group">
                  <div className="md:w-64 h-48 rounded-[2rem] overflow-hidden border border-brand-graphite shrink-0 bg-brand-obsidian relative">
                    <img src={draft.image} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform" alt="Preview" />
                    {draft.image_source === 'upload' && (
                      <div className="absolute top-4 right-4 bg-brand-amber text-brand-obsidian px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest shadow-lg">Upload</div>
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
                      <button onClick={() => startEditing(draft)} className="px-8 py-3.5 rounded-2xl bg-white text-brand-obsidian font-black text-[10px] uppercase tracking-widest hover:bg-brand-cyan transition-all">✏️ Editar & Revisar</button>
                      <button onClick={() => publishArticle(draft.id)} className="px-8 py-3.5 rounded-2xl bg-brand-cyan text-brand-obsidian font-black text-[10px] uppercase tracking-widest hover:bg-brand-purple hover:text-white transition-all">🚀 Publicar</button>
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
