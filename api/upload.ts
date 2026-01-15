
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Desativa o parser para lidar com stream binário
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  // 1. Extração de Variáveis de Ambiente (Prioridade Total para Env Vars)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Diagnóstico Crítico
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERRO DE CONFIGURAÇÃO BACKEND:");
    console.error("- SUPABASE_URL:", supabaseUrl ? "OK" : "AUSENTE");
    console.error("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "OK" : "AUSENTE");
    
    return res.status(500).json({ 
      success: false, 
      error: "Ambiente não configurado", 
      reason: "As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem ser configuradas na Vercel e o projeto deve ser REDEPLOYED." 
    });
  }

  try {
    // 2. Cliente com Service Role (Privilégios Administrativos - Ignora RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 3. Coleta do Stream Binário
    const chunks: any[] = [];
    req.on('data', (chunk: any) => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const buffer = Buffer.concat(chunks);
    
    // Metadados passados via Headers para simplicidade
    const fileName = req.headers['x-file-name'] || `upload-${Date.now()}.webp`;
    const contentType = req.headers['content-type'] || 'image/webp';

    // 4. Upload para o Bucket 'blog-images'
    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('blog-images')
      .upload(`posts/${fileName}`, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error('SUPABASE STORAGE ERROR (Service Role Attempt):', uploadError.message);
      return res.status(500).json({ 
        success: false, 
        error: "Erro no Storage do Supabase", 
        reason: uploadError.message 
      });
    }

    // 5. URL Pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('blog-images')
      .getPublicUrl(`posts/${fileName}`);

    console.log(`Upload concluído via Service Role: ${fileName}`);

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
