
// Fix: Explicitly import Buffer to resolve naming conflicts or missing globals in certain environments
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Desativa o parser padrão para lidar com multipart/form-data
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    // 1. Verificar Variáveis de Ambiente Críticas
    const supabaseUrl = process.env.SUPABASE_URL || 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente.");
      return res.status(500).json({ 
        success: false, 
        error: "Erro de Configuração no Servidor", 
        reason: "A chave de serviço (Service Role Key) é necessária para ignorar erros de permissão de RLS." 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Processar o stream de dados manualmente (Vercel Serverless compatível)
    // Para simplificar e evitar dependências extras, esperamos o arquivo via Base64 ou Multipart
    // Aqui usaremos a abordagem de receber o arquivo enviado pelo AdminDashboard
    
    // NOTA: No ambiente Vercel, arquivos grandes (>4.5MB) devem ser enviados para Vercel Blob.
    // Como o limite do blog é 2MB, o Supabase via API funciona perfeitamente.

    const chunks: any[] = [];
    req.on('data', (chunk: any) => chunks.push(chunk));
    
    await new Promise((resolve) => req.on('end', resolve));
    
    // Fix: Use the imported Buffer class to concatenate chunks collected from the stream
    const buffer = Buffer.concat(chunks);
    
    // Extrair metadados do header ou do corpo
    // Por simplicidade na implementação sem multer, o AdminDashboard enviará os dados necessários nos headers personalizados
    const fileName = req.headers['x-file-name'] || `upload-${Date.now()}.webp`;
    const contentType = req.headers['content-type'] || 'image/webp';

    // 3. Upload para o Supabase com Service Role (Ignora RLS)
    const { data, error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(`posts/${fileName}`, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error("UPLOAD ERROR (Supabase):", uploadError);
      return res.status(500).json({ 
        success: false, 
        error: "Falha ao gravar no Storage", 
        reason: uploadError.message 
      });
    }

    // 4. Obter URL Pública
    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(`posts/${fileName}`);

    return res.status(200).json({ 
      success: true, 
      image_url: publicUrl 
    });

  } catch (error: any) {
    console.error("CRITICAL UPLOAD ERROR:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Erro interno no processo de upload",
      details: error.message
    });
  }
}
