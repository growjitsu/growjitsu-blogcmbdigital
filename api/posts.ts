
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        if (error) {
          res.status(404).json({ success: false, error: 'Post não encontrado' });
          return;
        }
        res.status(200).json({ success: true, article: data });
        return;
      }

      let query = supabase.from('posts').select('*');
      if (status) query = query.eq('status', status);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      res.status(200).json({ success: true, articles: data });
      return;
    }

    if (req.method === 'POST') {
      const article = req.body;
      if (!article.id || !article.slug) {
        res.status(400).json({ success: false, error: 'Dados incompletos' });
        return;
      }

      // Sincronização segura via Upsert
      const { data, error } = await supabase
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
          meta_title: article.metaTitle,
          meta_description: article.metaDescription,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;
      res.status(200).json({ success: true, message: 'Dados persistidos com sucesso na nuvem.' });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID necessário para exclusão' });
        return;
      }

      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      res.status(200).json({ success: true, message: 'Registro removido permanentemente.' });
      return;
    }

    res.status(405).json({ success: false, error: 'Método não permitido' });
    return;

  } catch (error: any) {
    console.error("Posts API Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
    return;
  }
}
