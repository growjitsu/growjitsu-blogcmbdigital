
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  // URLs e Chaves atualizadas com os valores fornecidos pelo usuário
  const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const chunks: any[] = [];
    req.on('data', (chunk: any) => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const buffer = Buffer.concat(chunks);
    
    const fileName = req.headers['x-file-name'] || `upload-${Date.now()}.webp`;
    const contentType = req.headers['content-type'] || 'image/webp';

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('blog-images')
      .upload(`posts/${fileName}`, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('SUPABASE STORAGE ERROR:', uploadError.message);
      return res.status(500).json({ 
        success: false, 
        error: "Erro no Storage do Supabase", 
        reason: uploadError.message 
      });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('blog-images')
      .getPublicUrl(`posts/${fileName}`);

    return res.status(200).json({ 
      success: true, 
      image_url: publicUrl 
    });

  } catch (error: any) {
    console.error("INTERNAL API ERROR:", error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Falha interna no servidor de upload",
      details: error.message
    });
  }
}
