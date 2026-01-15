
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Necessário para processar o stream binário manualmente
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  // 1. Diagnóstico de Ambiente (Executado apenas no servidor)
  const supabaseUrl = process.env.SUPABASE_URL || 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error("CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.");
    return res.status(500).json({ 
      success: false, 
      error: "Erro de Permissão no Servidor", 
      reason: "A chave de serviço (Service Role Key) é necessária para ignorar erros de permissão de RLS." 
    });
  }

  try {
    // 2. Inicialização do Cliente com Service Role (Privilégios de Admin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Processamento do Stream de Dados
    const chunks: any[] = [];
    req.on('data', (chunk: any) => chunks.push(chunk));
    
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const buffer = Buffer.concat(chunks);
    
    // Metadados passados via Headers para evitar parsing complexo de multipart
    const fileName = req.headers['x-file-name'] || `upload-${Date.now()}.webp`;
    const contentType = req.headers['content-type'] || 'image/webp';

    // 4. Upload Físico (Bypass RLS via Service Role)
    const { data, error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(`posts/${fileName}`, buffer, {
        contentType,
        upsert: true // Permite substituir se o nome for idêntico
      });

    if (uploadError) {
      console.error('SUPABASE STORAGE ERROR:', uploadError.message);
      return res.status(500).json({ 
        success: false, 
        error: "Falha ao gravar no bucket", 
        reason: uploadError.message 
      });
    }

    // 5. Geração de URL Pública Permanente
    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(`posts/${fileName}`);

    console.log(`Upload bem-sucedido: ${fileName}`);

    return res.status(200).json({ 
      success: true, 
      image_url: publicUrl 
    });

  } catch (error: any) {
    console.error("INTERNAL UPLOAD ERROR:", error.message);
    return res.status(500).json({ 
      success: false, 
      error: "Erro interno no processo de upload",
      details: error.message
    });
  }
}
