import { createClient, SupabaseClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

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
// IN-MEMORY & PERSISTENT FALLBACK STORE
// -------------------------------------------------------------
const DATA_FILE = path.join(process.cwd(), 'server_data_store.json');

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

// Carrega dados salvos anteriormente se existirem
function loadPersistedStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.keys(data).forEach((key) => {
          if (Array.isArray(data[key]) && data[key].length > 0) {
            (memoryStore as any)[key] = data[key];
          }
        });
        console.log('[Persistence] Dados locais carregados de server_data_store.json');
      }
    }
  } catch (err) {
    console.warn('[Persistence] Erro ao ler server_data_store.json:', err);
  }
}

export function savePersistedStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Persistence] Erro ao salvar server_data_store.json:', err);
  }
}

// Inicializa o carregamento persistente
loadPersistedStore();

// Helper to generate simple unique IDs
function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// -------------------------------------------------------------
// USERS CRUD & SUPABASE AUTH INTEGRATION
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

/**
 * Sanitiza o objeto de usuário para evitar enviar campos inexistentes na tabela public.users
 * do Supabase (ex: campos virtuais do frontend como cidade_configurada, cidadeId, etc).
 */
function sanitizeUserForSupabase(data: any): any {
  if (!data || typeof data !== 'object') return {};
  const sanitized: any = {};
  const allowedKeys = ['id', 'nome', 'usuario', 'email', 'senha_hash', 'permissao', 'cidade_id', 'cidade_nome', 'created_at', 'updated_at'];

  for (const key of allowedKeys) {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  }

  // Mapeia variações comuns caso cidade_id ou cidade_nome tenham sido passados em camelCase
  if (sanitized.cidade_id === undefined && data.cidadeId !== undefined) {
    sanitized.cidade_id = data.cidadeId;
  }
  if (sanitized.cidade_nome === undefined && data.cidadeNome !== undefined) {
    sanitized.cidade_nome = data.cidadeNome;
  }

  return sanitized;
}

export async function upsertUserDoc(data: any): Promise<any> {
  const userObj = {
    ...data,
    id: String(data.id),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const sanitized = sanitizeUserForSupabase(userObj);
      let { data: upserted, error } = await supabase
        .from('users')
        .upsert(sanitized, { onConflict: 'id' })
        .select()
        .maybeSingle();

      // Se a tabela remota do Supabase não possuir as colunas de cidade ainda, tenta novamente apenas com colunas essenciais
      if (error && error.message && (error.message.includes('column') || error.message.includes('schema cache'))) {
        const basicSanitized: any = { id: String(data.id), updated_at: new Date().toISOString() };
        ['nome', 'usuario', 'email', 'senha_hash', 'permissao'].forEach((k) => {
          if (sanitized[k] !== undefined) basicSanitized[k] = sanitized[k];
        });
        const retryRes = await supabase
          .from('users')
          .upsert(basicSanitized, { onConflict: 'id' })
          .select()
          .maybeSingle();
        if (!retryRes.error && retryRes.data) {
          upserted = retryRes.data;
          error = null;
        }
      }

      if (!error && upserted) {
        const fullObj = { ...userObj, ...upserted };
        const idx = memoryStore.users.findIndex((u) => String(u.id) === String(userObj.id));
        if (idx !== -1) memoryStore.users[idx] = fullObj;
        else memoryStore.users.push(fullObj);
        savePersistedStore();
        return fullObj;
      }
      if (error) console.warn('[Supabase upsertUser error]', error.message);
    } catch (err) {
      console.warn('[Supabase upsertUser error]', err);
    }
  }

  const idx = memoryStore.users.findIndex((u) => String(u.id) === String(userObj.id));
  if (idx !== -1) {
    memoryStore.users[idx] = { ...memoryStore.users[idx], ...userObj };
    savePersistedStore();
    return memoryStore.users[idx];
  } else {
    memoryStore.users.push(userObj);
    savePersistedStore();
    return userObj;
  }
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
      const sanitized = sanitizeUserForSupabase(userObj);
      let { data: inserted, error } = await supabase.from('users').insert([sanitized]).select().maybeSingle();

      if (error && error.message && (error.message.includes('column') || error.message.includes('schema cache'))) {
        const basicSanitized: any = { id: newId, created_at: userObj.created_at };
        ['nome', 'usuario', 'email', 'senha_hash', 'permissao'].forEach((k) => {
          if (sanitized[k] !== undefined) basicSanitized[k] = sanitized[k];
        });
        const retryRes = await supabase.from('users').insert([basicSanitized]).select().maybeSingle();
        if (!retryRes.error && retryRes.data) {
          inserted = retryRes.data;
          error = null;
        }
      }

      if (!error && inserted) {
        const fullObj = { ...userObj, ...inserted };
        memoryStore.users.push(fullObj);
        savePersistedStore();
        return fullObj;
      }
      if (error) console.warn('[Supabase createUser error]', error.message);
    } catch (err) {
      console.warn('[Supabase createUser error]', err);
    }
  }

  memoryStore.users.push(userObj);
  savePersistedStore();
  return userObj;
}

/**
 * Cadastra o usuário no Supabase Authentication (auth.users)
 * e salva os dados complementares na tabela public.users vinculado pelo auth user ID
 */
export async function registerUserWithSupabaseAuth({
  nome,
  usuario,
  email,
  senha,
  permissao = 'Usuário comum',
}: {
  nome: string;
  usuario: string;
  email: string;
  senha: string;
  permissao?: string;
}): Promise<{ user: any; authUser?: any }> {
  const supabase = getSupabaseClient();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanUsuario = String(usuario).trim().replace(/^@/, '');
  const cleanNome = String(nome).trim();
  const cleanSenha = String(senha).trim();

  let authUserId: string | null = null;
  let authUserObj: any = null;

  if (supabase) {
    try {
      // 1. Tentar criar via Admin API (caso tenha service_role key)
      let adminCreated = false;
      if (supabase.auth?.admin?.createUser) {
        try {
          const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
            email: cleanEmail,
            password: cleanSenha,
            email_confirm: true,
            user_metadata: {
              nome: cleanNome,
              usuario: cleanUsuario,
              permissao: permissao,
            },
          });

          if (!adminErr && adminData?.user) {
            authUserId = adminData.user.id;
            authUserObj = adminData.user;
            adminCreated = true;
            console.log('[Supabase Auth Admin] Usuário criado com sucesso em Authentication -> Users:', authUserId);
          } else if (adminErr) {
            console.log('[Supabase Auth Admin info]', adminErr.message);
          }
        } catch (_adminEx) {
          // Continua para o signUp padrão
        }
      }

      // 2. Se não criado pelo Admin, usar supabase.auth.signUp()
      if (!adminCreated) {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanSenha,
          options: {
            data: {
              nome: cleanNome,
              usuario: cleanUsuario,
              permissao: permissao,
            },
          },
        });

        if (signUpErr) {
          console.warn('[Supabase auth.signUp error]', signUpErr.message);
          if (signUpErr.message.toLowerCase().includes('already registered')) {
            const existingInDb = await findUserByUsernameOrEmail(cleanEmail);
            if (existingInDb) {
              throw new Error('Este e-mail já está cadastrado no sistema.');
            }
          } else {
            throw new Error(signUpErr.message);
          }
        } else if (signUpData?.user) {
          authUserId = signUpData.user.id;
          authUserObj = signUpData.user;
          console.log('[Supabase auth.signUp] Usuário criado com sucesso em Authentication -> Users:', authUserId);
        }
      }
    } catch (err: any) {
      console.warn('[Supabase Auth register exception]', err.message);
      if (err.message && (err.message.includes('already') || err.message.includes('password') || err.message.includes('email') || err.message.includes('cadastrado'))) {
        throw err;
      }
    }
  }

  // 3. Salvar os dados na tabela customizada public.users vinculando pelo ID retornado da Autenticação
  const finalId = authUserId || generateId('usr');
  const hash = bcrypt.hashSync(cleanSenha, 10);

  const userRecord = {
    id: finalId,
    nome: cleanNome,
    usuario: cleanUsuario,
    email: cleanEmail,
    senha_hash: hash,
    permissao: permissao,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const savedUser = await upsertUserDoc(userRecord);
  return { user: savedUser, authUser: authUserObj };
}

/**
 * Autentica o usuário pelo Supabase Auth (auth.users) e sincroniza com a tabela public.users
 */
export async function loginUserWithSupabaseAuth(
  identifier: string,
  senha: string
): Promise<{ user: any; supabaseSession?: any }> {
  const cleanInput = String(identifier || '').trim();
  const cleanSenha = String(senha || '').trim();
  const supabase = getSupabaseClient();

  // 1. Localizar registro na tabela public.users ou memória
  let user = await findUserByUsernameOrEmail(cleanInput);

  // Determinar o e-mail para autenticação no Supabase Auth
  let emailToAuth = user?.email || (cleanInput.includes('@') ? cleanInput.toLowerCase() : null);

  let supabaseAuthSuccess = false;
  let authUserData: any = null;

  // 2. Tentar autenticação via Supabase Auth
  if (supabase && emailToAuth) {
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password: cleanSenha,
      });

      if (!authErr && authData?.user) {
        supabaseAuthSuccess = true;
        authUserData = authData.user;
        console.log('[Supabase Auth] Login com sucesso em auth.users para:', authUserData.email);

        // Se o usuário não existir no public.users ou tiver id diferente, sincronizar com o ID da autenticação
        if (!user || String(user.id) !== String(authUserData.id)) {
          const syncedUser = {
            id: authUserData.id,
            nome: user?.nome || authUserData.user_metadata?.nome || authUserData.email?.split('@')[0] || 'Usuário',
            usuario: user?.usuario || authUserData.user_metadata?.usuario || authUserData.email?.split('@')[0] || 'usuario',
            email: authUserData.email || emailToAuth,
            senha_hash: user?.senha_hash || bcrypt.hashSync(cleanSenha, 10),
            permissao: user?.permissao || authUserData.user_metadata?.permissao || 'Usuário comum',
          };
          user = await upsertUserDoc(syncedUser);
        }
      } else {
        if (authErr) {
          console.warn('[Supabase auth.signInWithPassword]', authErr.message);
        }
      }
    } catch (err: any) {
      console.warn('[Supabase auth.signIn error]', err.message);
    }
  }

  // 3. Validação de fallback caso o usuário tenha sido cadastrado localmente ou bcrypt hash
  if (!supabaseAuthSuccess) {
    if (!user) {
      if (cleanInput.toLowerCase() === 'admin' || cleanInput.toLowerCase() === 'admin@quadras.com') {
        user = memoryStore.users.find((u) => u.usuario === 'admin');
      }
    }

    if (!user) {
      throw new Error('Usuário ou senha incorretos.');
    }

    const validPassword = bcrypt.compareSync(cleanSenha, user.senha_hash || '');
    if (!validPassword) {
      throw new Error('Usuário ou senha incorretos.');
    }

    // Se as credenciais locais bateram mas o usuário ainda não estava no auth.users do Supabase,
    // registrá-lo automaticamente no Supabase Auth para futuras sessões
    if (supabase && user.email) {
      try {
        await supabase.auth.signUp({
          email: user.email,
          password: cleanSenha,
          options: {
            data: {
              nome: user.nome,
              usuario: user.usuario,
              permissao: user.permissao,
            },
          },
        });
        console.log('[Supabase Auth Sync] Usuário sincronizado automaticamente com Supabase Auth:', user.email);
      } catch (_syncErr) {
        // Ignora caso já exista
      }
    }
  }

  return {
    user: {
      id: user.id,
      nome: user.nome,
      usuario: user.usuario,
      email: user.email,
      permissao: user.permissao,
      cidade_id: user.cidade_id || user.cidadeId || null,
      cidadeId: user.cidade_id || user.cidadeId || null,
      cidade_nome: user.cidade_nome || user.cidadeNome || null,
      cidadeNome: user.cidade_nome || user.cidadeNome || null,
      cidade_configurada: user.cidade_configurada ?? (!!user.cidade_nome || !!user.cidadeNome),
      cidadeConfigurada: user.cidade_configurada ?? (!!user.cidade_nome || !!user.cidadeNome),
    },
  };
}

/**
 * Define ou atualiza a cidade do usuário.
 * Cria a cidade se não existir e garante que a cidade tenha pelo menos um bairro padrão (Centro).
 */
export async function setUserCity(
  userId: string,
  cidadeNome: string,
  cidadeId?: string
): Promise<{ user: any; cidade: any }> {
  const cleanNome = String(cidadeNome || '').trim();
  if (!cleanNome) {
    throw new Error('O nome da cidade não pode ser vazio.');
  }

  const cidades = await getCidades();
  let targetCidade: any = null;

  if (cidadeId) {
    targetCidade = cidades.find((c: any) => String(c.id) === String(cidadeId));
  }

  if (!targetCidade) {
    targetCidade = cidades.find(
      (c: any) => (c.nome || '').toLowerCase().trim() === cleanNome.toLowerCase()
    );
  }

  if (!targetCidade) {
    targetCidade = await createCidadeDoc({
      nome: cleanNome,
      estado: 'SP',
    });
  }

  // Garantir que a cidade possui pelo menos um bairro para organização dos territórios
  const bairros = await getBairros();
  const cityBairros = bairros.filter((b: any) => String(b.cidade_id) === String(targetCidade.id));
  if (cityBairros.length === 0) {
    await createBairroDoc({
      cidade_id: String(targetCidade.id),
      nome: 'Centro',
      status: 'Não Iniciado',
      total_quadras: 0,
      quadras_concluidas: 0,
      percentual_concluido: 0,
    });
  }

  // Atualiza o documento do usuário
  const userUpdates = {
    cidade_id: String(targetCidade.id),
    cidade_nome: targetCidade.nome,
    cidade_configurada: true,
  };

  const updatedUser = await updateUserDoc(String(userId), userUpdates);

  return {
    user: {
      id: updatedUser.id,
      nome: updatedUser.nome,
      usuario: updatedUser.usuario,
      email: updatedUser.email,
      permissao: updatedUser.permissao,
      cidade_id: targetCidade.id,
      cidadeId: targetCidade.id,
      cidade_nome: targetCidade.nome,
      cidadeNome: targetCidade.nome,
      cidade_configurada: true,
      cidadeConfigurada: true,
    },
    cidade: targetCidade,
  };
}

export async function updateUserDoc(id: string, updates: any): Promise<any> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const sanitized = sanitizeUserForSupabase(updates);
      if (Object.keys(sanitized).length > 0) {
        let { data, error } = await supabase
          .from('users')
          .update({ ...sanitized, updated_at: new Date().toISOString() })
          .eq('id', String(id))
          .select()
          .maybeSingle();

        // Se a coluna de cidade não existir remotamente, tenta atualizar apenas campos base
        if (error && error.message && (error.message.includes('column') || error.message.includes('schema cache'))) {
          const basicSanitized: any = {};
          ['nome', 'usuario', 'email', 'senha_hash', 'permissao'].forEach((k) => {
            if (sanitized[k] !== undefined) basicSanitized[k] = sanitized[k];
          });
          if (Object.keys(basicSanitized).length > 0) {
            const retryRes = await supabase
              .from('users')
              .update({ ...basicSanitized, updated_at: new Date().toISOString() })
              .eq('id', String(id))
              .select()
              .maybeSingle();
            if (!retryRes.error && retryRes.data) data = retryRes.data;
          }
        }
      }
    } catch (err) {
      console.warn('[Supabase updateUser error]', err);
    }
  }

  const idx = memoryStore.users.findIndex((u) => String(u.id) === String(id));
  if (idx !== -1) {
    memoryStore.users[idx] = { ...memoryStore.users[idx], ...updates, updated_at: new Date().toISOString() };
    savePersistedStore();
    return memoryStore.users[idx];
  }
  const newUser = { id, ...updates, updated_at: new Date().toISOString() };
  memoryStore.users.push(newUser);
  savePersistedStore();
  return newUser;
}

export async function deleteUserDoc(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Deletar da tabela public.users
      await supabase.from('users').delete().eq('id', String(id));
      
      // Tentar deletar da autenticação caso tenha permissão admin
      if (supabase.auth?.admin?.deleteUser) {
        try {
          await supabase.auth.admin.deleteUser(String(id));
        } catch (_adminDelErr) {
          // Permissão pode não estar disponível com anon key
        }
      }
    } catch (err) {
      console.warn('[Supabase deleteUser error]', err);
    }
  }
  memoryStore.users = memoryStore.users.filter((u) => String(u.id) !== String(id));
  savePersistedStore();
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
  savePersistedStore();
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
    savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
    savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
    savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
    savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
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
  savePersistedStore();
}
