
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mapeia os dados do banco para o formato da Interface Article
const mapToFrontend = (p: any) => ({
  ...p,
  metaTitle: p.meta_title || p.metaTitle || '',
  metaDescription: p.meta_description || p.metaDescription || ''
});

export default async function handler(req: any, res: any) {
  if (res.headersSent) return;
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET') {
      const { slug, status } = req.query;

      if (slug) {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('slug', slug)
          .single();
        if (error) return res.status(404).json({ success: false, error: 'Post não encontrado' });
        return res.status(200).json({ success: true, article: mapToFrontend(data) });
      }

      let query = supabase.from('posts').select('*');
      if (status) query = query.eq('status', status);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, articles: data.map(mapToFrontend) });
    }

    if (req.method === 'POST') {
      const article = req.body;
      if (!article.id || !article.slug) {
        return res.status(400).json({ success: false, error: 'Dados incompletos para persistência' });
      }

      const { error } = await supabase
        .from('posts')
        .upsert({
          id: article.id,
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          category: article.category,
          author: article.author || 'CMBDIGITAL',
          date: article.date,
          image: article.image,
          tags: article.tags,
          status: article.status || 'draft',
          meta_title: article.metaTitle || article.meta_title,
          meta_description: article.metaDescription || article.meta_description,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Protocolo sincronizado com a nuvem.' });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'ID necessário' });

      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Registro removido permanentemente.' });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });

  } catch (error: any) {
    console.error("Posts API Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
