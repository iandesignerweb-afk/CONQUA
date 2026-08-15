import { createClient, SupabaseClient } from '@supabase/supabase-js';

// -------------------------------------------------------------
// SUPABASE CLIENT INITIALIZATION (LAZY & RESILIENT)
// -------------------------------------------------------------
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (url && key && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log('[Supabase] Cliente conectado com sucesso a:', url);
      return supabaseInstance;
    } catch (err) {
      console.error('[Supabase] Erro ao inicializar cliente Supabase:', err);
    }
  }
  return null;
}

// -------------------------------------------------------------
// IN-MEMORY FALLBACK STORE (Garante funcionamento contínuo)
// -------------------------------------------------------------
const memoryStore = {
  users: [
    {
      id: 'usr_admin',
      nome: 'Administrador',
      usuario: 'admin',
      email: 'admin@quadras.com',
      senha_hash: '$2a$10$7vY4q7iZ0LhUfXvF3dZt5.uQhE0sJ1k3R6W9j8mYgB2lPnOpQ4x7a', // admin123
      permissao: 'Administrador',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr_carlos',
      nome: 'Carlos Silva',
      usuario: 'carlos',
      email: 'carlos@quadras.com',
      senha_hash: '$2a$10$eO0V4hY1.Vf9c7fC2eX.8.1BqE1kJ3u7Y8mB4vN9oP0qR1sT2u3vW', // user123
      permissao: 'Usuário comum',
      created_at: new Date().toISOString(),
    },
  ] as any[],
  cidades: [
    { id: 'cid_1', nome: 'São Paulo', estado: 'SP', created_at: new Date().toISOString() },
  ] as any[],
  bairros: [
    { id: 'bai_1', cidade_id: 'cid_1', nome: 'Centro', created_at: new Date().toISOString() },
  ] as any[],
  quadras: [] as any[],
  cartoes: [] as any[],
  cartao_quadras: [] as any[],
  cartao_designacoes: [] as any[],
  historico: [] as any[],
  audit_logs: [] as any[],
  registro_territorios: [] as any[],
};

// Helper to generate simple unique IDs
function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// -------------------------------------------------------------
// USERS CRUD
// -------------------------------------------------------------
export async function getUsers(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) return data;
      if (error) console.warn('[Supabase getUsers]', error.message);
    } catch (err) {
      console.warn('[Supabase getUsers error]', err);
    }
  }
  return memoryStore.users;
}

export async function getUserById(id: string): Promise<any | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', String(id)).maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getUserById error]', err);
    }
  }
  return memoryStore.users.find((u) => String(u.id) === String(id)) || null;
}

export async function findUserByUsernameOrEmail(identifier: string): Promise<any | null> {
  const clean = String(identifier || '').trim().toLowerCase();
  if (!clean) return null;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`usuario.ilike.${clean},email.ilike.${clean}`)
        .maybeSingle();

      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase findUser error]', err);
    }
  }

  return (
    memoryStore.users.find(
      (u) =>
        (u.usuario && u.usuario.toLowerCase() === clean) ||
        (u.email && u.email.toLowerCase() === clean)
    ) || null
  );
}

export async function createUserDoc(data: any): Promise<any> {
  const newId = data.id ? String(data.id) : generateId('usr');
  const userObj = {
    ...data,
    id: newId,
    created_at: data.created_at || new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: inserted, error } = await supabase.from('users').insert([userObj]).select().maybeSingle();
      if (!error && inserted) return inserted;
      if (error) console.warn('[Supabase createUser error]', error.message);
    } catch (err) {
      console.warn('[Supabase createUser error]', err);
    }
  }

  memoryStore.users.push(userObj);
  return userObj;
}

export async function updateUserDoc(id: string, updates: any): Promise<any> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', String(id))
        .select()
        .maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase updateUser error]', err);
    }
  }

  const idx = memoryStore.users.findIndex((u) => String(u.id) === String(id));
  if (idx !== -1) {
    memoryStore.users[idx] = { ...memoryStore.users[idx], ...updates };
    return memoryStore.users[idx];
  }
  return { id, ...updates };
}

export async function deleteUserDoc(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('users').delete().eq('id', String(id));
    } catch (err) {
      console.warn('[Supabase deleteUser error]', err);
    }
  }
  memoryStore.users = memoryStore.users.filter((u) => String(u.id) !== String(id));
}

// -------------------------------------------------------------
// CIDADES CRUD
// -------------------------------------------------------------
export async function getCidades(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('cidades').select('*').order('nome', { ascending: true });
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getCidades]', err);
    }
  }
  return [...memoryStore.cidades].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

export async function getCidadeById(id: string): Promise<any | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('cidades').select('*').eq('id', String(id)).maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getCidadeById]', err);
    }
  }
  return memoryStore.cidades.find((c) => String(c.id) === String(id)) || null;
}

export async function createCidadeDoc(data: any): Promise<any> {
  const newId = data.id ? String(data.id) : generateId('cid');
  const cidadeObj = { ...data, id: newId, created_at: new Date().toISOString() };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: inserted, error } = await supabase.from('cidades').insert([cidadeObj]).select().maybeSingle();
      if (!error && inserted) return inserted;
    } catch (err) {
      console.warn('[Supabase createCidade]', err);
    }
  }

  memoryStore.cidades.push(cidadeObj);
  return cidadeObj;
}

export async function updateCidadeDoc(id: string, updates: any): Promise<any> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('cidades').update(updates).eq('id', String(id)).select().maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase updateCidade]', err);
    }
  }

  const idx = memoryStore.cidades.findIndex((c) => String(c.id) === String(id));
  if (idx !== -1) {
    memoryStore.cidades[idx] = { ...memoryStore.cidades[idx], ...updates };
    return memoryStore.cidades[idx];
  }
  return { id, ...updates };
}

export async function deleteCidadeDoc(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('cidades').delete().eq('id', String(id));
    } catch (err) {
      console.warn('[Supabase deleteCidade]', err);
    }
  }
  memoryStore.cidades = memoryStore.cidades.filter((c) => String(c.id) !== String(id));
}

// -------------------------------------------------------------
// BAIRROS CRUD
// -------------------------------------------------------------
export async function getBairros(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('bairros').select('*').order('nome', { ascending: true });
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getBairros]', err);
    }
  }
  return [...memoryStore.bairros].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

export async function getBairroById(id: string): Promise<any | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('bairros').select('*').eq('id', String(id)).maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getBairroById]', err);
    }
  }
  return memoryStore.bairros.find((b) => String(b.id) === String(id)) || null;
}

export async function createBairroDoc(data: any): Promise<any> {
  const newId = data.id ? String(data.id) : generateId('bai');
  const bairroObj = { ...data, id: newId, created_at: new Date().toISOString() };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: inserted, error } = await supabase.from('bairros').insert([bairroObj]).select().maybeSingle();
      if (!error && inserted) return inserted;
    } catch (err) {
      console.warn('[Supabase createBairro]', err);
    }
  }

  memoryStore.bairros.push(bairroObj);
  return bairroObj;
}

export async function updateBairroDoc(id: string, updates: any): Promise<any> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('bairros').update(updates).eq('id', String(id)).select().maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase updateBairro]', err);
    }
  }

  const idx = memoryStore.bairros.findIndex((b) => String(b.id) === String(id));
  if (idx !== -1) {
    memoryStore.bairros[idx] = { ...memoryStore.bairros[idx], ...updates };
    return memoryStore.bairros[idx];
  }
  return { id, ...updates };
}

export async function deleteBairroDoc(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('bairros').delete().eq('id', String(id));
    } catch (err) {
      console.warn('[Supabase deleteBairro]', err);
    }
  }
  memoryStore.bairros = memoryStore.bairros.filter((b) => String(b.id) !== String(id));
}

// -------------------------------------------------------------
// QUADRAS CRUD
// -------------------------------------------------------------
export async function getQuadras(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('quadras').select('*');
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getQuadras]', err);
    }
  }
  return memoryStore.quadras;
}

export async function getQuadraById(id: string): Promise<any | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('quadras').select('*').eq('id', String(id)).maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getQuadraById]', err);
    }
  }
  return memoryStore.quadras.find((q) => String(q.id) === String(id)) || null;
}

export async function createQuadraDoc(data: any): Promise<any> {
  const newId = data.id ? String(data.id) : generateId('qda');
  const quadraObj = { ...data, id: newId, created_at: new Date().toISOString() };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: inserted, error } = await supabase.from('quadras').insert([quadraObj]).select().maybeSingle();
      if (!error && inserted) return inserted;
    } catch (err) {
      console.warn('[Supabase createQuadra]', err);
    }
  }

  memoryStore.quadras.push(quadraObj);
  return quadraObj;
}

export async function bulkCreateQuadrasDocs(inserts: any[]): Promise<any[]> {
  const list = inserts.map((item) => ({
    ...item,
    id: item.id ? String(item.id) : generateId('qda'),
    created_at: item.created_at || new Date().toISOString(),
  }));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('quadras').insert(list).select();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase bulkCreateQuadras]', err);
    }
  }

  memoryStore.quadras.push(...list);
  return list;
}

export async function updateQuadraDoc(id: string, updates: any): Promise<any> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('quadras').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', String(id)).select().maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase updateQuadra]', err);
    }
  }

  const idx = memoryStore.quadras.findIndex((q) => String(q.id) === String(id));
  if (idx !== -1) {
    memoryStore.quadras[idx] = { ...memoryStore.quadras[idx], ...updates };
    return memoryStore.quadras[idx];
  }
  return { id, ...updates };
}

export async function deleteQuadraDoc(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('quadras').delete().eq('id', String(id));
    } catch (err) {
      console.warn('[Supabase deleteQuadra]', err);
    }
  }
  memoryStore.quadras = memoryStore.quadras.filter((q) => String(q.id) !== String(id));
}

// -------------------------------------------------------------
// CARTOES CRUD
// -------------------------------------------------------------
export async function getCartoes(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('cartoes').select('*');
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getCartoes]', err);
    }
  }
  return memoryStore.cartoes;
}

export async function getCartaoById(id: string): Promise<any | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('cartoes').select('*').eq('id', String(id)).maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getCartaoById]', err);
    }
  }
  return memoryStore.cartoes.find((c) => String(c.id) === String(id)) || null;
}

export async function createCartaoDoc(data: any): Promise<any> {
  const newId = data.id ? String(data.id) : generateId('crt');
  const cartaoObj = { ...data, id: newId, created_at: new Date().toISOString() };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: inserted, error } = await supabase.from('cartoes').insert([cartaoObj]).select().maybeSingle();
      if (!error && inserted) return inserted;
    } catch (err) {
      console.warn('[Supabase createCartao]', err);
    }
  }

  memoryStore.cartoes.push(cartaoObj);
  return cartaoObj;
}

export async function updateCartaoDoc(id: string, updates: any): Promise<any> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('cartoes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', String(id)).select().maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase updateCartao]', err);
    }
  }

  const idx = memoryStore.cartoes.findIndex((c) => String(c.id) === String(id));
  if (idx !== -1) {
    memoryStore.cartoes[idx] = { ...memoryStore.cartoes[idx], ...updates };
    return memoryStore.cartoes[idx];
  }
  return { id, ...updates };
}

export async function deleteCartaoDoc(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('cartoes').delete().eq('id', String(id));
    } catch (err) {
      console.warn('[Supabase deleteCartao]', err);
    }
  }
  memoryStore.cartoes = memoryStore.cartoes.filter((c) => String(c.id) !== String(id));
}

// -------------------------------------------------------------
// CARTAO_QUADRAS (Joins)
// -------------------------------------------------------------
export async function getCartaoQuadras(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('cartao_quadras').select('*');
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getCartaoQuadras]', err);
    }
  }
  return memoryStore.cartao_quadras;
}

export async function addCartaoQuadras(joins: { cartao_id: string; quadra_id: string }[]): Promise<void> {
  const list = joins.map((j) => ({ ...j, id: generateId('cq'), created_at: new Date().toISOString() }));
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('cartao_quadras').insert(list);
    } catch (err) {
      console.warn('[Supabase addCartaoQuadras]', err);
    }
  }
  memoryStore.cartao_quadras.push(...list);
}

export async function deleteCartaoQuadrasByCartaoId(cartaoId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('cartao_quadras').delete().eq('cartao_id', String(cartaoId));
    } catch (err) {
      console.warn('[Supabase deleteCartaoQuadras]', err);
    }
  }
  memoryStore.cartao_quadras = memoryStore.cartao_quadras.filter((cq) => String(cq.cartao_id) !== String(cartaoId));
}

// -------------------------------------------------------------
// CARTAO_DESIGNACOES
// -------------------------------------------------------------
export async function getCartaoDesignacoes(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('designacoes').select('*');
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getCartaoDesignacoes]', err);
    }
  }
  return memoryStore.cartao_designacoes;
}

export async function addCartaoDesignacoes(rows: any[]): Promise<void> {
  const list = rows.map((r) => ({ ...r, id: r.id ? String(r.id) : generateId('des'), created_at: new Date().toISOString() }));
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('designacoes').insert(list);
    } catch (err) {
      console.warn('[Supabase addCartaoDesignacoes]', err);
    }
  }
  memoryStore.cartao_designacoes.push(...list);
}

export async function deleteCartaoDesignacoesByCartaoId(cartaoId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('designacoes').delete().eq('cartao_id', String(cartaoId));
    } catch (err) {
      console.warn('[Supabase deleteCartaoDesignacoes]', err);
    }
  }
  memoryStore.cartao_designacoes = memoryStore.cartao_designacoes.filter((cd) => String(cd.cartao_id) !== String(cartaoId));
}

// -------------------------------------------------------------
// HISTORICO
// -------------------------------------------------------------
export async function getHistorico(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('historico').select('*').order('data_hora', { ascending: false });
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getHistorico]', err);
    }
  }
  return [...memoryStore.historico].sort((a, b) => (b.data_hora || '').localeCompare(a.data_hora || ''));
}

export async function addHistoricoDocs(entries: any | any[]): Promise<void> {
  const list = (Array.isArray(entries) ? entries : [entries]).map((item) => ({
    ...item,
    id: item.id ? String(item.id) : generateId('hst'),
    data_hora: item.data_hora || new Date().toISOString(),
  }));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('historico').insert(list);
    } catch (err) {
      console.warn('[Supabase addHistorico]', err);
    }
  }
  memoryStore.historico.push(...list);
}

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------
export async function getAuditLogs(): Promise<any[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
    } catch (err) {
      console.warn('[Supabase getAuditLogs]', err);
    }
  }
  return [...memoryStore.audit_logs].sort((a, b) => (b.data_hora || b.created_at || '').localeCompare(a.data_hora || a.created_at || ''));
}

export async function addAuditLogDoc(entry: any): Promise<void> {
  const logObj = {
    ...entry,
    id: entry.id ? String(entry.id) : generateId('log'),
    created_at: entry.data_hora || entry.created_at || new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('audit_logs').insert([logObj]);
    } catch (err) {
      console.warn('[Supabase addAuditLog]', err);
    }
  }
  memoryStore.audit_logs.push(logObj);
}
