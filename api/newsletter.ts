
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'E-mail inválido' });
  }

  const supabaseUrl = 'https://qgwgvtcjaagrmwzrutxm.supabase.co';
  // Use the service role key to bypass RLS and unique constraints check
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnd2d2dGNqYWFncm13enJ1dHhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3NzU4NiwiZXhwIjoyMDgzNzUzNTg2fQ.kwrkF8B24jCk4RvenX8qr2ot4pLVwVCUhHkbWfmQKpE';

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Protocolo de Verificação: Checar se o e-mail já existe para feedback amigável
    const { data: existing } = await supabaseAdmin
      .from('newsletter_subscribers')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(200).json({ 
        success: true, 
        message: 'Você já está em nossa lista de insiders! Fique atento às novidades.' 
      });
    }

    const { error } = await supabaseAdmin
      .from('newsletter_subscribers')
      .insert([
        { 
          email: email.toLowerCase().trim(),
          created_at: new Date().toISOString()
        }
      ]);

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      message: 'Conexão estabelecida! Você receberá nossos protocolos de elite em breve.' 
    });

  } catch (error: any) {
    console.error("Newsletter API Error:", error.message);
    // Se o erro for de duplicata no banco (unique constraint), tratamos como sucesso silencioso
    if (error.code === '23505') {
      return res.status(200).json({ 
        success: true, 
        message: 'E-mail já cadastrado. Sincronização mantida.' 
      });
    }
    return res.status(500).json({ success: false, error: 'Falha ao processar assinatura técnica.' });
  }
}
