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
  senha_hash TEXT NOT NULL,
  permissao TEXT NOT NULL DEFAULT 'Dirigente',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
