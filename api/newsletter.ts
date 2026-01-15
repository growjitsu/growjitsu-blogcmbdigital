
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'E-mail inválido. Por favor, verifique o formato.' });
  }

  const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
  // Utiliza chave de serviço para bypass de RLS em operações administrativas (Newsletter)
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Etapa 1: Verificar existência sem causar erro 406 (Not Acceptable) do PostgREST
    // .single() gera erro se 0 linhas forem encontradas. .select() é mais seguro para checagem.
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('email')
      .eq('email', email.toLowerCase().trim());

    if (checkError) {
      // Se a tabela não existir, o erro será capturado aqui.
      console.error("Erro na verificação da tabela newsletter_subscribers:", checkError.message);
      throw new Error(`Falha na base de dados: ${checkError.message}`);
    }

    if (existing && existing.length > 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'Você já está cadastrado em nossa rede de insights!' 
      });
    }

    // Etapa 2: Inserção do novo assinante
    const { error: insertError } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert([
        { 
          email: email.toLowerCase().trim(),
          created_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      // Tratamento específico para erro de duplicata (Unique Constraint)
      if (insertError.code === '23505') {
        return res.status(200).json({ 
          success: true, 
          message: 'E-mail já sincronizado anteriormente.' 
        });
      }
      throw insertError;
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Inscrição confirmada! Prepare-se para conteúdos de alta autoridade.' 
    });

  } catch (error: any) {
    console.error("NEWSLETTER_SUBSCRIPTION_ERROR:", error);
    // Retorna a mensagem real do erro para o frontend conseguir identificar o problema exato (ex: Tabela não encontrada)
    return res.status(500).json({ 
      success: false, 
      error: `Erro ao processar assinatura: ${error.message || 'Falha técnica desconhecida.'}` 
    });
  }
}
