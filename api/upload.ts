
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Nome do bucket - Certifique-se que este nome existe no seu painel Supabase
const BUCKET_NAME = 'blog-images';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
  // Prioriza variável de ambiente, mas usa a fornecida como fallback seguro para a sessão atual
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Diagnóstico: Listar buckets para verificar se o nome está correto
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    if (bucketError) {
      console.error('ERRO AO LISTAR BUCKETS:', bucketError.message);
    } else {
      console.log('Buckets disponíveis no projeto:', buckets?.map(b => b.name));
      const exists = buckets?.find(b => b.name === BUCKET_NAME);
      if (!exists) {
        return res.status(404).json({ 
          success: false, 
          error: "Bucket não encontrado", 
          reason: `O bucket '${BUCKET_NAME}' não existe no Supabase. Crie-o ou altere o código para um dos seguintes: ${buckets?.map(b => b.name).join(', ')}` 
        });
      }
    }

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
      .from(BUCKET_NAME)
      .upload(`posts/${fileName}`, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('SUPABASE STORAGE UPLOAD ERROR:', uploadError.message);
      return res.status(500).json({ 
        success: false, 
        error: "Falha no upload binário", 
        reason: uploadError.message 
      });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`posts/${fileName}`);

    return res.status(200).json({ 
      success: true, 
      image_url: publicUrl 
    });

  } catch (error: any) {
    console.error("API CRITICAL ERROR:", error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Erro interno no servidor de upload",
      details: error.message
    });
  }
}
