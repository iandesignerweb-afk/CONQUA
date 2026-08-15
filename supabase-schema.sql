-- ==============================================================================
-- SCHEMA SUPABASE - SISTEMA DE CONTROLE DE QUADRAS E TERRITÓRIOS
-- Copie e cole este script no SQL Editor do seu Dashboard Supabase e clique em RUN
-- ==============================================================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL DEFAULT '',
  permissao TEXT NOT NULL DEFAULT 'Dirigente',
  cidade_id TEXT,
  cidade_nome TEXT,
  cidade_configurada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migrações incrementais caso a tabela users já exista no Supabase
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cidade_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cidade_nome TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cidade_configurada BOOLEAN DEFAULT false;

-- 2. TABELA DE CIDADES
CREATE TABLE IF NOT EXISTS public.cidades (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'SP',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE BAIRROS
CREATE TABLE IF NOT EXISTS public.bairros (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cidade_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE CARTÕES
CREATE TABLE IF NOT EXISTS public.cartoes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  numero INTEGER,
  codigo TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  cidade_id TEXT,
  cidade_nome TEXT,
  bairro_id TEXT,
  bairro_nome TEXT,
  usuario_id TEXT,
  usuario_nome TEXT,
  status TEXT DEFAULT 'Disponível',
  data_designacao TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  link_mapa TEXT,
  observacoes TEXT,
  quadras_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE QUADRAS
CREATE TABLE IF NOT EXISTS public.quadras (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bairro_id TEXT NOT NULL,
  cartao_id TEXT,
  numero TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Nao_Trabalhada',
  responsavel TEXT,
  usuario_id TEXT,
  data_designacao TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  observacoes TEXT,
  historico JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE DESIGNAÇÕES (HISTÓRICO)
CREATE TABLE IF NOT EXISTS public.designacoes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cartao_id TEXT,
  quadra_id TEXT,
  usuario_id TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  data_designacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_devolucao TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA DE LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  user_nome TEXT NOT NULL,
  acao TEXT NOT NULL,
  detalhes TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABELA DE REGISTRO DE TERRITÓRIOS (S-13)
CREATE TABLE IF NOT EXISTS public.registro_territorios (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cartao_id TEXT,
  numero_territorio TEXT,
  descricao TEXT,
  dirigente_nome TEXT,
  dirigente_id TEXT,
  data_designacao TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  observacoes TEXT,
  ano INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para alta performance
CREATE INDEX IF NOT EXISTS idx_users_usuario ON public.users (usuario);
CREATE INDEX IF NOT EXISTS idx_bairros_cidade ON public.bairros (cidade_id);
CREATE INDEX IF NOT EXISTS idx_quadras_bairro ON public.quadras (bairro_id);
CREATE INDEX IF NOT EXISTS idx_quadras_cartao ON public.quadras (cartao_id);
CREATE INDEX IF NOT EXISTS idx_cartoes_usuario ON public.cartoes (usuario_id);
CREATE INDEX IF NOT EXISTS idx_designacoes_usuario ON public.designacoes (usuario_id);

-- ==============================================================================
-- (OPCIONAL) TRIGGER AUTOMÁTICO PARA SINCRONIZAR auth.users COM public.users
-- Executa automaticamente quando um usuário for criado no Supabase Auth
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nome, usuario, email, permissao, created_at, updated_at)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'usuario', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'permissao', 'Usuário comum'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativar trigger caso ainda não exista
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

