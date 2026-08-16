import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  getUsers,
  getUserById,
  findUserByUsernameOrEmail,
  createUserDoc,
  upsertUserDoc,
  registerUserWithSupabaseAuth,
  loginUserWithSupabaseAuth,
  updateUserDoc,
  deleteUserDoc,
  getCidades,
  getCidadeById,
  createCidadeDoc,
  updateCidadeDoc,
  deleteCidadeDoc,
  getBairros,
  getBairroById,
  createBairroDoc,
  updateBairroDoc,
  deleteBairroDoc,
  getQuadras,
  getQuadraById,
  createQuadraDoc,
  bulkCreateQuadrasDocs,
  updateQuadraDoc,
  deleteQuadraDoc,
  getCartoes,
  getCartaoById,
  createCartaoDoc,
  updateCartaoDoc,
  deleteCartaoDoc,
  getCartaoQuadras,
  addCartaoQuadras,
  deleteCartaoQuadrasByCartaoId,
  getCartaoDesignacoes,
  addCartaoDesignacoes,
  deleteCartaoDesignacoesByCartaoId,
  getHistorico,
  addHistoricoDocs,
  getAuditLogs,
  addAuditLogDoc,
  setUserCity,
  syncAndCleanOrphanData,
} from './supabaseServer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'controle_de_quadras_supabase_secret_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string | number;
    usuario: string;
    nome: string;
    email?: string;
    permissao: 'Administrador' | 'Dirigente' | 'Usuário comum';
    cidade_id?: string | number | null;
    cidadeId?: string | number | null;
    cidade_nome?: string | null;
    cidadeNome?: string | null;
    cidade_configurada?: boolean;
    cidadeConfigurada?: boolean;
  };
}

export const app = express();
app.use(express.json());

// -------------------------------------------------------------
// HELPER: AUDIT LOG WRITER
// -------------------------------------------------------------
async function addAuditLog(
  usuarioId: string | number | null,
  usuarioNome: string,
  acao: string,
  detalhes: string,
  ip: string = '127.0.0.1'
) {
  try {
    await addAuditLogDoc({
      usuario_id: usuarioId ? String(usuarioId) : null,
      usuario_nome: usuarioNome,
      acao,
      detalhes,
      ip,
      data_hora: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Erro ao gravar log de auditoria no Supabase:', err);
  }
}

// -------------------------------------------------------------
// INITIAL SEED FOR DEMO / ADMIN USERS
// -------------------------------------------------------------
export async function seedDefaultUsers() {
  try {
    const defaultUsers = [
      { nome: 'Administrador', usuario: 'admin', email: 'admin@quadras.com', senha: 'admin123', permissao: 'Administrador' },
      { nome: 'Carlos Silva', usuario: 'carlos', email: 'carlos@quadras.com', senha: 'user123', permissao: 'Usuário comum' },
    ];

    for (const u of defaultUsers) {
      const existing = await findUserByUsernameOrEmail(u.usuario);
      const hash = bcrypt.hashSync(u.senha, 10);
      if (!existing) {
        await createUserDoc({
          nome: u.nome,
          usuario: u.usuario,
          email: u.email,
          senha_hash: hash,
          permissao: u.permissao,
        });
        console.log(`[Supabase Seed] Criado usuário padrão: ${u.usuario}`);
      } else {
        const matches = existing.senha_hash ? bcrypt.compareSync(u.senha, existing.senha_hash) : false;
        if (!matches) {
          await updateUserDoc(String(existing.id), { senha_hash: hash });
          console.log(`[Supabase Seed] Atualizada senha para usuário padrão: ${u.usuario}`);
        }
      }
    }

    // Limpa registros órfãos ou resíduos deixados por cartões excluídos
    await syncAndCleanOrphanData();
  } catch (err) {
    console.warn('[Supabase Seed] Erro ao inicializar usuários padrões:', err);
  }
}

// Initial trigger
seedDefaultUsers().catch(console.error);

// -------------------------------------------------------------
// MIDDLEWARES DE AUTENTICAÇÃO E PERMISSÃO
// -------------------------------------------------------------
const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    let userDoc = await getUserById(String(decoded.id));

    if (!userDoc && decoded.email) {
      userDoc = await findUserByUsernameOrEmail(decoded.email);
    }

    if (!userDoc && decoded.usuario) {
      userDoc = await findUserByUsernameOrEmail(decoded.usuario);
    }

    // Se o token for válido e assinado pelo servidor, mas o usuário não foi encontrado em memória (ex: reinício do servidor), reconstrói o usuário
    if (!userDoc && decoded.id) {
      const fallbackUsername = decoded.usuario || (decoded.email ? decoded.email.split('@')[0] : 'usuario');
      userDoc = {
        id: String(decoded.id),
        nome: decoded.nome || fallbackUsername,
        usuario: fallbackUsername,
        email: decoded.email || `${fallbackUsername}@quadras.com`,
        permissao: decoded.permissao || 'Usuário comum',
        cidade_id: decoded.cidade_id || decoded.cidadeId || null,
        cidade_nome: decoded.cidade_nome || decoded.cidadeNome || null,
        cidade_configurada: !!(decoded.cidade_nome || decoded.cidadeNome || decoded.cidade_configurada),
        created_at: new Date().toISOString(),
      };
      await upsertUserDoc(userDoc);
    }

    if (!userDoc) {
      return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
    }

    const hasCity = !!(userDoc.cidade_nome || userDoc.cidadeNome);
    const cityConfigured = userDoc.cidade_configurada ?? hasCity;

    req.user = {
      id: userDoc.id,
      usuario: userDoc.usuario,
      nome: userDoc.nome || userDoc.usuario,
      email: userDoc.email,
      permissao: userDoc.permissao || 'Usuário comum',
      cidade_id: userDoc.cidade_id || userDoc.cidadeId || null,
      cidadeId: userDoc.cidade_id || userDoc.cidadeId || null,
      cidade_nome: userDoc.cidade_nome || userDoc.cidadeNome || null,
      cidadeNome: userDoc.cidade_nome || userDoc.cidadeNome || null,
      cidade_configurada: cityConfigured,
      cidadeConfigurada: cityConfigured,
    };

    return next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }
};

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Acesso não autorizado. Faça login.' });
  }
  const role = String(req.user.permissao || '').toLowerCase();
  if (role !== 'administrador' && role !== 'admin' && role !== 'dirigente') {
    return res.status(403).json({ error: 'Acesso restrito para administradores e dirigentes.' });
  }
  next();
};

// -------------------------------------------------------------
// ROTAS DE AUTENTICAÇÃO
// -------------------------------------------------------------

// Login tradicional com Usuário / E-mail e Senha (SUPABASE AUTH INTEGRATED)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { usuario, senha } = req.body;
    if (!usuario || !senha) {
      return res.status(400).json({ error: 'Usuário/E-mail e senha são obrigatórios.' });
    }

    const cleanInput = String(usuario).trim();
    const cleanSenha = String(senha).trim();

    // Fallback: If user is admin/admin123 and not found yet, ensure seeded
    if (cleanInput.toLowerCase() === 'admin' || cleanInput.toLowerCase() === 'admin@quadras.com') {
      await seedDefaultUsers();
    }

    // Realiza login no Supabase Auth e sincroniza com a base de dados
    const loginResult = await loginUserWithSupabaseAuth(cleanInput, cleanSenha);
    const user = loginResult.user;

    const token = jwt.sign(
      { id: user.id, email: user.email, usuario: user.usuario, permissao: user.permissao, nome: user.nome },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await addAuditLog(user.id, user.nome, 'Login', `Usuário ${user.usuario} realizou login.`, req.ip);

    return res.json({
      token,
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
        cidade_configurada: user.cidade_configurada ?? user.cidadeConfigurada ?? false,
        cidadeConfigurada: user.cidade_configurada ?? user.cidadeConfigurada ?? false,
      },
    });
  } catch (err: any) {
    console.error('Erro no login Supabase:', err);
    return res.status(401).json({ error: err.message || 'Usuário ou senha incorretos.' });
  }
});

// Cadastro de novos usuários (Cria em Supabase Authentication -> Users e salva no public.users com mesmo ID)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { usuario, email, senha, confirmarSenha, cidadeNome, cidade_nome } = req.body;

    if (!usuario || !email || !senha || !confirmarSenha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios para cadastro.' });
    }

    if (senha !== confirmarSenha) {
      return res.status(400).json({ error: 'A senha e a confirmação não coincidem.' });
    }

    if (String(senha).length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    const cleanUsername = String(usuario).trim().replace(/^@/, '');
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanSenha = String(senha).trim();

    const existingUser = await findUserByUsernameOrEmail(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
    }

    const existingEmail = await findUserByUsernameOrEmail(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }

    // Todo usuário que se cadastrar na criação de conta passa a ser Administrador da sua conta/organização
    const permissao = 'Administrador';

    // Cria o usuário em Supabase Authentication (auth.users) e salva em public.users com o auth user ID
    const regResult = await registerUserWithSupabaseAuth({
      nome: cleanUsername,
      usuario: cleanUsername,
      email: cleanEmail,
      senha: cleanSenha,
      permissao,
    });

    let newUser = regResult.user;

    const initialCity = cidadeNome || cidade_nome;
    if (initialCity && String(initialCity).trim()) {
      try {
        const cityRes = await setUserCity(String(newUser.id), String(initialCity).trim());
        newUser = cityRes.user;
      } catch (cErr) {
        console.warn('Erro ao associar cidade inicial durante cadastro:', cErr);
      }
    }

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, usuario: newUser.usuario, permissao: newUser.permissao, nome: newUser.nome },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await addAuditLog(newUser.id, newUser.nome, 'Cadastro', `Novo usuário ${newUser.usuario} cadastrado via Supabase Auth.`, req.ip);

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        nome: newUser.nome,
        usuario: newUser.usuario,
        email: newUser.email,
        permissao: newUser.permissao,
        cidade_id: newUser.cidade_id || newUser.cidadeId || null,
        cidadeId: newUser.cidade_id || newUser.cidadeId || null,
        cidade_nome: newUser.cidade_nome || newUser.cidadeNome || null,
        cidadeNome: newUser.cidade_nome || newUser.cidadeNome || null,
        cidade_configurada: newUser.cidade_configurada ?? newUser.cidadeConfigurada ?? false,
        cidadeConfigurada: newUser.cidade_configurada ?? newUser.cidadeConfigurada ?? false,
      },
    });
  } catch (err: any) {
    console.error('Erro no cadastro Supabase:', err);
    return res.status(400).json({ error: err.message || 'Erro interno ao processar cadastro.' });
  }
});

// Autenticação com Google
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, name, uid } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório para autenticação do Google.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    let user = await findUserByUsernameOrEmail(cleanEmail);

    if (!user) {
      const baseName = name || cleanEmail.split('@')[0];
      const baseUsername = cleanEmail.split('@')[0];

      const dummyHash = bcrypt.hashSync('GoogleAuth_' + Date.now(), 10);
      user = await upsertUserDoc({
        id: uid || undefined,
        nome: baseName,
        usuario: baseUsername,
        email: cleanEmail,
        senha_hash: dummyHash,
        permissao: 'Administrador',
        cidade_configurada: false,
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, usuario: user.usuario, permissao: user.permissao, nome: user.nome },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await addAuditLog(user.id, user.nome, 'Login Google', `Usuário ${user.usuario} logou via Google.`, req.ip);

    return res.json({
      token,
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
    });
  } catch (err: any) {
    console.error('Erro na autenticação com Google:', err);
    return res.status(500).json({ error: 'Erro interno na autenticação com Google: ' + err.message });
  }
});

// Endpoint para o usuário configurar / salvar sua cidade
app.post('/api/auth/cidade', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { cidadeNome, nomeCidade, cidadeId, cidade_id } = req.body;
    const targetNome = cidadeNome || nomeCidade;
    const targetId = cidadeId || cidade_id;

    if (!targetNome || !String(targetNome).trim()) {
      return res.status(400).json({ error: 'O nome da cidade é obrigatório.' });
    }

    const result = await setUserCity(String(req.user!.id), String(targetNome).trim(), targetId);

    await addAuditLog(
      req.user!.id,
      req.user!.nome,
      'Configurou Cidade',
      `Usuário ${req.user!.usuario} definiu a sua cidade como "${result.cidade.nome}".`,
      req.ip
    );

    return res.json({
      message: 'Cidade configurada com sucesso.',
      user: result.user,
      cidade: result.cidade,
    });
  } catch (err: any) {
    console.error('Erro ao configurar cidade:', err);
    return res.status(500).json({ error: 'Erro ao configurar cidade: ' + err.message });
  }
});

// Alias PUT /api/users/minha-cidade
app.put('/api/users/minha-cidade', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { cidadeNome, nomeCidade, cidadeId, cidade_id } = req.body;
    const targetNome = cidadeNome || nomeCidade;
    const targetId = cidadeId || cidade_id;

    if (!targetNome || !String(targetNome).trim()) {
      return res.status(400).json({ error: 'O nome da cidade é obrigatório.' });
    }

    const result = await setUserCity(String(req.user!.id), String(targetNome).trim(), targetId);

    return res.json({
      message: 'Cidade atualizada com sucesso.',
      user: result.user,
      cidade: result.cidade,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar cidade: ' + err.message });
  }
});

// Recovery Request
app.post('/api/auth/recover', async (req: Request, res: Response) => {
  try {
    const { usuario } = req.body;
    if (!usuario) {
      return res.status(400).json({ error: 'Informe o usuário ou e-mail.' });
    }

    const user = await findUserByUsernameOrEmail(String(usuario));
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      message: `Instruções de recuperação foram enviadas para o e-mail cadastrado (${user.email}).`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro na recuperação de senha: ' + err.message });
  }
});

app.post('/api/auth/recover-password', async (req: Request, res: Response) => {
  try {
    const { usuario } = req.body;
    if (!usuario) {
      return res.status(400).json({ error: 'Informe o usuário ou e-mail.' });
    }

    const user = await findUserByUsernameOrEmail(String(usuario));
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      message: `Instruções de recuperação foram enviadas para o e-mail cadastrado (${user.email}).`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro na recuperação de senha: ' + err.message });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user) {
    await addAuditLog(req.user.id, req.user.nome, 'Logout', `Usuário ${req.user.usuario} fez logout.`, req.ip);
  }
  return res.json({ message: 'Logout realizado com sucesso.' });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  return res.json(req.user);
});

// -------------------------------------------------------------
// ROTAS DE GERENCIAMENTO DE USUÁRIOS (ADMIN)
// -------------------------------------------------------------
app.get('/api/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await getUsers();
    const sanitized = users.map((u: any) => ({
      id: u.id,
      nome: u.nome,
      usuario: u.usuario,
      email: u.email,
      permissao: u.permissao,
      created_at: u.created_at,
    }));
    return res.json(sanitized);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar usuários: ' + err.message });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, usuario, email, senha, permissao } = req.body;
    if (!nome || !nome.trim() || !usuario || !usuario.trim() || !senha || !senha.trim()) {
      return res.status(400).json({ error: 'Nome, usuário de login e senha são obrigatórios.' });
    }

    const cleanNome = String(nome).trim();
    const cleanUsuario = String(usuario).trim().replace(/^@/, '').toLowerCase();
    const cleanEmail = email && String(email).trim()
      ? String(email).trim().toLowerCase()
      : `${cleanUsuario}@territorio.local`;
    const cleanPermissao = permissao || 'Dirigente';

    const existing = await findUserByUsernameOrEmail(cleanUsuario);
    if (existing) {
      return res.status(400).json({ error: 'Já existe um usuário com esse nome de login.' });
    }

    const existingEmail = await findUserByUsernameOrEmail(cleanEmail);
    if (existingEmail) {
      return res.status(400).json({ error: 'Já existe um usuário com esse e-mail cadastrado.' });
    }

    // Registra na Autenticação do Supabase e salva na tabela public.users
    const regResult = await registerUserWithSupabaseAuth({
      nome: cleanNome,
      usuario: cleanUsuario,
      email: cleanEmail,
      senha: String(senha).trim(),
      permissao: cleanPermissao,
    });

    const newUser = regResult.user;

    await addAuditLog(req.user!.id, req.user!.nome, 'Criou Usuário', `Criou o usuário ${newUser.usuario} (${newUser.nome}).`, req.ip);

    return res.status(201).json({
      id: newUser.id,
      nome: newUser.nome,
      usuario: newUser.usuario,
      email: newUser.email,
      permissao: newUser.permissao,
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'Erro ao criar usuário: ' + err.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, usuario, email, senha, permissao } = req.body;

    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const updates: any = {};
    if (nome && String(nome).trim()) updates.nome = String(nome).trim();
    if (usuario && String(usuario).trim()) updates.usuario = String(usuario).trim().replace(/^@/, '').toLowerCase();
    if (email && String(email).trim()) updates.email = String(email).trim().toLowerCase();
    if (permissao) updates.permissao = permissao;
    if (senha && String(senha).trim()) updates.senha_hash = bcrypt.hashSync(String(senha).trim(), 10);

    const updated = await updateUserDoc(id, updates);

    await addAuditLog(req.user!.id, req.user!.nome, 'Atualizou Usuário', `Atualizou o usuário ${updated.usuario}.`, req.ip);

    return res.json({
      id: updated.id,
      nome: updated.nome,
      usuario: updated.usuario,
      email: updated.email,
      permissao: updated.permissao,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário: ' + err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    await deleteUserDoc(id);
    await addAuditLog(req.user!.id, req.user!.nome, 'Excluiu Usuário', `Excluiu o usuário ${user.usuario}.`, req.ip);

    return res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao excluir usuário: ' + err.message });
  }
});

// -------------------------------------------------------------
// ROTAS DE CIDADES
// -------------------------------------------------------------
app.get('/api/cidades', authenticateToken, async (req: Request, res: Response) => {
  try {
    const cidades = await getCidades();
    return res.json(cidades);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar cidades: ' + err.message });
  }
});

app.post('/api/cidades', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'O nome da cidade é obrigatório.' });
    }

    const newCidade = await createCidadeDoc({ nome: nome.trim() });
    await addAuditLog(req.user!.id, req.user!.nome, 'Criou Cidade', `Criou a cidade ${newCidade.nome}.`, req.ip);

    return res.status(201).json(newCidade);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar cidade: ' + err.message });
  }
});

app.put('/api/cidades/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;

    const updated = await updateCidadeDoc(id, { nome: nome.trim() });
    await addAuditLog(req.user!.id, req.user!.nome, 'Atualizou Cidade', `Renomeou cidade para ${updated.nome}.`, req.ip);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar cidade: ' + err.message });
  }
});

app.delete('/api/cidades/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cidade = await getCidadeById(id);
    if (!cidade) {
      return res.status(404).json({ error: 'Cidade não encontrada.' });
    }

    await deleteCidadeDoc(id);
    await addAuditLog(req.user!.id, req.user!.nome, 'Excluiu Cidade', `Excluiu a cidade ${cidade.nome}.`, req.ip);

    return res.json({ message: 'Cidade excluída com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao excluir cidade: ' + err.message });
  }
});

app.post('/api/cidades/:id/reset', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cidade = await getCidadeById(id);
    if (!cidade) {
      return res.status(404).json({ error: 'Cidade não encontrada.' });
    }

    const bairros = await getBairros();
    const cityBairroIds = bairros
      .filter((b: any) => String(b.cidade_id) === String(id))
      .map((b: any) => String(b.id));

    const quadras = await getQuadras();
    const cityQuadras = quadras.filter(
      (q: any) => cityBairroIds.includes(String(q.bairro_id)) || String(q.cidade_id) === String(id)
    );

    const historicoEntries: any[] = [];
    for (const q of cityQuadras) {
      if (q.status === 'Feita') {
        await updateQuadraDoc(q.id, {
          status: 'Pendente',
          data_conclusao: null,
          usuario_id: null,
          usuario_nome: null,
        });

        historicoEntries.push({
          quadra_id: q.id,
          quadra_numero: q.numero,
          bairro_id: q.bairro_id,
          bairro_nome: cidade.nome,
          acao: 'Reset',
          usuario_id: req.user!.id,
          usuario_nome: req.user!.nome,
          observacao: 'Reinicialização da Cidade',
        });
      }
    }

    if (historicoEntries.length > 0) {
      await addHistoricoDocs(historicoEntries);
    }

    for (const bId of cityBairroIds) {
      await updateBairroDoc(bId, {
        status: 'Não Iniciado',
        quadras_concluidas: 0,
        percentual_concluido: 0,
        data_conclusao: null,
      });
    }

    await addAuditLog(req.user!.id, req.user!.nome, 'Reiniciou Cidade', `Reiniciou todas as quadras da cidade ${cidade.nome}.`, req.ip);

    return res.json({ message: 'Cidade reiniciada com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao reiniciar cidade: ' + err.message });
  }
});

// -------------------------------------------------------------
// ROTAS DE BAIRROS
// -------------------------------------------------------------
app.get('/api/bairros', authenticateToken, async (req: Request, res: Response) => {
  try {
    await syncAndCleanOrphanData();
    const { cidadeId, cidade_id } = req.query;
    let bairros = await getBairros();
    const cidades = await getCidades();
    const cidadesMap = new Map(cidades.map((c: any) => [String(c.id), c.nome]));

    const targetCid = cidadeId || cidade_id;
    if (targetCid) {
      bairros = bairros.filter((b: any) => String(b.cidade_id) === String(targetCid));
    }

    const result = bairros.map((b: any) => ({
      ...b,
      id: b.id,
      nome: b.nome,
      cidadeId: b.cidade_id,
      cidade_id: b.cidade_id,
      cidadeNome: cidadesMap.get(String(b.cidade_id)) || 'Cidade Desconhecida',
      cidades: { nome: cidadesMap.get(String(b.cidade_id)) || 'Cidade Desconhecida' },
      status: b.status || 'Não Iniciado',
      totalQuadras: b.total_quadras || 0,
      total_quadras: b.total_quadras || 0,
      quadrasConcluidas: b.quadras_concluidas || 0,
      quadras_concluidas: b.quadras_concluidas || 0,
      percentualConcluido: b.percentual_concluido || 0,
      percentual_concluido: b.percentual_concluido || 0,
      dataConclusao: b.data_conclusao || null,
      data_conclusao: b.data_conclusao || null,
    }));

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar bairros: ' + err.message });
  }
});

app.post('/api/bairros', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { nome, cidade_id, cidadeId } = req.body;
    const resolvedCidadeId = cidade_id || cidadeId;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Nome do bairro é obrigatório.' });
    }

    let finalCidadeId = resolvedCidadeId;
    if (!finalCidadeId) {
      const cidades = await getCidades();
      if (cidades.length > 0) {
        finalCidadeId = cidades[0].id;
      } else {
        const newCid = await createCidadeDoc({ nome: 'Cidade Principal' });
        finalCidadeId = newCid.id;
      }
    }

    const newBairro = await createBairroDoc({
      nome: nome.trim(),
      cidade_id: String(finalCidadeId),
      status: 'Não Iniciado',
      total_quadras: 0,
      quadras_concluidas: 0,
      percentual_concluido: 0,
    });

    await addAuditLog(req.user!.id, req.user!.nome, 'Criou Bairro', `Criou o bairro ${newBairro.nome}.`, req.ip);

    return res.status(201).json({
      ...newBairro,
      cidadeId: finalCidadeId,
      cidade_id: finalCidadeId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar bairro: ' + err.message });
  }
});

app.put('/api/bairros/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, cidade_id, cidadeId } = req.body;

    const updates: any = {};
    if (nome) updates.nome = nome.trim();
    if (cidade_id || cidadeId) updates.cidade_id = String(cidade_id || cidadeId);

    const updated = await updateBairroDoc(id, updates);
    await addAuditLog(req.user!.id, req.user!.nome, 'Atualizou Bairro', `Atualizou o bairro ${updated.nome}.`, req.ip);

    return res.json({
      ...updated,
      cidadeId: updated.cidade_id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar bairro: ' + err.message });
  }
});

app.delete('/api/bairros/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const bairro = await getBairroById(id);
    if (!bairro) {
      return res.status(404).json({ error: 'Bairro não encontrado.' });
    }

    await deleteBairroDoc(id);
    await addAuditLog(req.user!.id, req.user!.nome, 'Excluiu Bairro', `Excluiu o bairro ${bairro.nome}.`, req.ip);

    return res.json({ message: 'Bairro excluído com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao excluir bairro: ' + err.message });
  }
});

app.post('/api/bairros/:id/reset', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const bairro = await getBairroById(id);
    if (!bairro) {
      return res.status(404).json({ error: 'Bairro não encontrado.' });
    }

    const quadras = await getQuadras();
    const bairroQuadras = quadras.filter((q: any) => String(q.bairro_id) === String(id));

    const historicoEntries: any[] = [];
    for (const q of bairroQuadras) {
      if (q.status === 'Feita') {
        await updateQuadraDoc(q.id, {
          status: 'Pendente',
          data_conclusao: null,
          usuario_id: null,
          usuario_nome: null,
        });

        historicoEntries.push({
          quadra_id: q.id,
          quadra_numero: q.numero,
          bairro_id: id,
          bairro_nome: bairro.nome,
          acao: 'Reset',
          usuario_id: req.user!.id,
          usuario_nome: req.user!.nome,
          observacao: 'Reinicialização do Bairro',
        });
      }
    }

    if (historicoEntries.length > 0) {
      await addHistoricoDocs(historicoEntries);
    }

    await updateBairroDoc(id, {
      status: 'Não Iniciado',
      quadras_concluidas: 0,
      percentual_concluido: 0,
      data_conclusao: null,
    });

    await addAuditLog(req.user!.id, req.user!.nome, 'Reiniciou Bairro', `Reiniciou todas as quadras do bairro ${bairro.nome}.`, req.ip);

    return res.json({ message: 'Bairro reiniciado com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao reiniciar bairro: ' + err.message });
  }
});

// -------------------------------------------------------------
// ROTAS DE QUADRAS
// -------------------------------------------------------------
async function getOrCreateBairro(
  cidadeId?: string | number | null,
  bairroId?: string | number | null,
  cidadeNome?: string | null,
  bairroNome?: string | null
): Promise<{ cidadeId: string; cidadeNome: string; bairroId: string; bairroNome: string }> {
  // 1. Resolve Cidade
  let resolvedCid: any = null;
  const cidades = await getCidades();

  if (cidadeId) {
    resolvedCid = cidades.find((c: any) => String(c.id) === String(cidadeId));
  }
  if (!resolvedCid && cidadeNome && String(cidadeNome).trim()) {
    const cleanCNome = String(cidadeNome).trim().toLowerCase();
    resolvedCid = cidades.find((c: any) => (c.nome || '').toLowerCase().trim() === cleanCNome);
    if (!resolvedCid) {
      resolvedCid = await createCidadeDoc({ nome: String(cidadeNome).trim(), estado: 'SP' });
    }
  }
  if (!resolvedCid) {
    if (cidades.length > 0) {
      resolvedCid = cidades[0];
    } else {
      resolvedCid = await createCidadeDoc({ nome: 'Canapi', estado: 'AL' });
    }
  }

  // 2. Resolve Bairro
  let resolvedBai: any = null;
  const bairros = await getBairros();

  if (bairroId) {
    resolvedBai = bairros.find((b: any) => String(b.id) === String(bairroId));
  }
  if (!resolvedBai && bairroNome && String(bairroNome).trim()) {
    const cleanBNome = String(bairroNome).trim().toLowerCase();
    resolvedBai = bairros.find(
      (b: any) => String(b.cidade_id) === String(resolvedCid.id) && (b.nome || '').toLowerCase().trim() === cleanBNome
    );
    if (!resolvedBai) {
      resolvedBai = await createBairroDoc({
        cidade_id: String(resolvedCid.id),
        nome: String(bairroNome).trim(),
      });
    }
  }
  if (!resolvedBai) {
    resolvedBai = bairros.find((b: any) => String(b.cidade_id) === String(resolvedCid.id));
  }
  if (!resolvedBai) {
    resolvedBai = await createBairroDoc({
      cidade_id: String(resolvedCid.id),
      nome: 'Centro',
    });
  }

  return {
    cidadeId: String(resolvedCid.id),
    cidadeNome: resolvedCid.nome,
    bairroId: String(resolvedBai.id),
    bairroNome: resolvedBai.nome,
  };
}

app.get('/api/quadras', authenticateToken, async (req: Request, res: Response) => {
  try {
    await syncAndCleanOrphanData();
    const { search, bairro_id, bairroId, cidade_id, cidadeId, status, usuarioId, usuario_id, numero } = req.query;
    let quadras = await getQuadras();
    const bairros = await getBairros();
    const cidades = await getCidades();
    const users = await getUsers();

    const targetBairroId = bairro_id || bairroId;
    if (targetBairroId) {
      quadras = quadras.filter((q: any) => String(q.bairro_id) === String(targetBairroId));
    }

    const targetCidadeId = cidade_id || cidadeId;
    if (targetCidadeId) {
      const cityBairroIds = bairros
        .filter((b: any) => String(b.cidade_id) === String(targetCidadeId))
        .map((b: any) => String(b.id));
      quadras = quadras.filter((q: any) => cityBairroIds.includes(String(q.bairro_id)) || String(q.cidade_id) === String(targetCidadeId));
    }

    if (status && status !== 'Todos') {
      const normalizedStatus = status === 'Feitas' || status === 'Feita' ? 'Feita' : status === 'Pendentes' || status === 'Não feita' || status === 'Pendente' ? 'Pendente' : status;
      quadras = quadras.filter((q: any) => {
        if (normalizedStatus === 'Feita') return q.status === 'Feita';
        return q.status === 'Pendente' || q.status === 'Não feita';
      });
    }

    const targetUserId = usuarioId || usuario_id;
    if (targetUserId) {
      quadras = quadras.filter((q: any) => String(q.usuario_id) === String(targetUserId));
    }

    if (numero) {
      const numStr = String(numero).trim().toLowerCase();
      quadras = quadras.filter((q: any) => String(q.numero || '').toLowerCase().includes(numStr));
    }

    if (search) {
      const s = String(search).toLowerCase();
      quadras = quadras.filter(
        (q: any) =>
          (q.numero && String(q.numero).toLowerCase().includes(s)) ||
          (q.usuario_nome && q.usuario_nome.toLowerCase().includes(s)) ||
          (q.observacao && q.observacao.toLowerCase().includes(s))
      );
    }

    const bairrosMap = new Map(bairros.map((b: any) => [String(b.id), b]));
    const cidadesMap = new Map(cidades.map((c: any) => [String(c.id), c]));
    const usersMap = new Map(users.map((u: any) => [String(u.id), u]));

    const enriched = quadras.map((q: any) => {
      const bairro = bairrosMap.get(String(q.bairro_id));
      const cidade = bairro ? cidadesMap.get(String(bairro.cidade_id)) : null;
      const user = q.usuario_id ? usersMap.get(String(q.usuario_id)) : null;

      return {
        ...q,
        id: q.id,
        numero: q.numero,
        status: q.status === 'Feita' ? 'Feita' : 'Não feita',
        bairroId: q.bairro_id,
        bairro_id: q.bairro_id,
        bairroNome: bairro ? bairro.nome : (q.bairro_nome || ''),
        bairro_nome: bairro ? bairro.nome : (q.bairro_nome || ''),
        cidadeId: cidade ? cidade.id : (bairro ? bairro.cidade_id : null),
        cidade_id: cidade ? cidade.id : (bairro ? bairro.cidade_id : null),
        cidadeNome: cidade ? cidade.nome : '',
        cidade_nome: cidade ? cidade.nome : '',
        usuarioId: q.usuario_id || null,
        usuario_id: q.usuario_id || null,
        usuarioNome: user ? user.nome : (q.usuario_nome || null),
        usuario_nome: user ? user.nome : (q.usuario_nome || null),
        concluidaEm: q.data_conclusao || q.concluida_em || null,
        data_conclusao: q.data_conclusao || q.concluida_em || null,
        createdAt: q.created_at || null,
        created_at: q.created_at || null,
      };
    });

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar quadras: ' + err.message });
  }
});

app.post('/api/quadras', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { numero, observacao } = req.body;
    const bairro_id_input = req.body.bairro_id || req.body.bairroId;
    const cidade_id_input = req.body.cidade_id || req.body.cidadeId;
    const bairro_nome_input = req.body.bairro_nome || req.body.bairroNome;
    const cidade_nome_input = req.body.cidade_nome || req.body.cidadeNome;

    if (!numero || String(numero).trim() === '') {
      return res.status(400).json({ error: 'Número da quadra é obrigatório.' });
    }

    const loc = await getOrCreateBairro(cidade_id_input, bairro_id_input, cidade_nome_input, bairro_nome_input);

    const newQuadra = await createQuadraDoc({
      numero: String(numero).trim(),
      bairro_id: String(loc.bairroId),
      status: 'Pendente',
      observacao: observacao || '',
    });

    // Atualizar contador do bairro
    const quadras = await getQuadras();
    const bairroQuadras = quadras.filter((q: any) => String(q.bairro_id) === String(loc.bairroId));
    const done = bairroQuadras.filter((q: any) => q.status === 'Feita').length;
    const total = bairroQuadras.length;
    const perc = total > 0 ? Math.round((done / total) * 100) : 0;

    await updateBairroDoc(String(loc.bairroId), {
      total_quadras: total,
      quadras_concluidas: done,
      percentual_concluido: perc,
    });

    await addAuditLog(req.user!.id, req.user!.nome, 'Criou Quadra', `Criou a quadra ${newQuadra.numero}.`, req.ip);

    return res.status(201).json(newQuadra);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar quadra: ' + err.message });
  }
});

app.post('/api/quadras/bulk', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { inicio, fim } = req.body;
    const bairro_id_input = req.body.bairro_id || req.body.bairroId;
    const cidade_id_input = req.body.cidade_id || req.body.cidadeId;
    const bairro_nome_input = req.body.bairro_nome || req.body.bairroNome;
    const cidade_nome_input = req.body.cidade_nome || req.body.cidadeNome;

    if (inicio === undefined || fim === undefined) {
      return res.status(400).json({ error: 'Intervalo (início e fim) é obrigatório.' });
    }

    const start = Number(inicio);
    const end = Number(fim);
    if (isNaN(start) || isNaN(end) || start > end) {
      return res.status(400).json({ error: 'Intervalo inválido (início deve ser menor ou igual ao fim).' });
    }

    const loc = await getOrCreateBairro(cidade_id_input, bairro_id_input, cidade_nome_input, bairro_nome_input);

    const inserts: any[] = [];
    for (let i = start; i <= end; i++) {
      inserts.push({
        numero: String(i),
        bairro_id: String(loc.bairroId),
        status: 'Pendente',
      });
    }

    const created = await bulkCreateQuadrasDocs(inserts);

    // Atualizar estatísticas do bairro
    const quadras = await getQuadras();
    const bairroQuadras = quadras.filter((q: any) => String(q.bairro_id) === String(loc.bairroId));
    const done = bairroQuadras.filter((q: any) => q.status === 'Feita').length;
    const total = bairroQuadras.length;
    const perc = total > 0 ? Math.round((done / total) * 100) : 0;

    await updateBairroDoc(String(loc.bairroId), {
      total_quadras: total,
      quadras_concluidas: done,
      percentual_concluido: perc,
    });

    await addAuditLog(req.user!.id, req.user!.nome, 'Criou Quadras em Lote', `Criou quadras de ${start} a ${end}.`, req.ip);

    return res.status(201).json({
      message: `${created.length} quadras criadas com sucesso.`,
      count: created.length,
      quadras: created,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro no cadastro em lote: ' + err.message });
  }
});

app.put('/api/quadras/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { numero, status, usuario_id, usuario_nome, observacao } = req.body;

    const updates: any = {};
    if (numero) updates.numero = String(numero).trim();
    if (status) updates.status = status;
    if (usuario_id !== undefined) updates.usuario_id = usuario_id ? String(usuario_id) : null;
    if (usuario_nome !== undefined) updates.usuario_nome = usuario_nome || null;
    if (observacao !== undefined) updates.observacao = observacao;

    const updated = await updateQuadraDoc(id, updates);
    await addAuditLog(req.user!.id, req.user!.nome, 'Atualizou Quadra', `Atualizou quadra ${updated.numero}.`, req.ip);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar quadra: ' + err.message });
  }
});

app.delete('/api/quadras/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const quadra = await getQuadraById(id);
    if (!quadra) {
      return res.status(404).json({ error: 'Quadra não encontrada.' });
    }

    await deleteQuadraDoc(id);

    // Recalcular bairro
    if (quadra.bairro_id) {
      const quadras = await getQuadras();
      const bairroQuadras = quadras.filter((q: any) => String(q.bairro_id) === String(quadra.bairro_id));
      const done = bairroQuadras.filter((q: any) => q.status === 'Feita').length;
      const total = bairroQuadras.length;
      const perc = total > 0 ? Math.round((done / total) * 100) : 0;

      await updateBairroDoc(String(quadra.bairro_id), {
        total_quadras: total,
        quadras_concluidas: done,
        percentual_concluido: perc,
      });
    }

    await addAuditLog(req.user!.id, req.user!.nome, 'Excluiu Quadra', `Excluiu a quadra ${quadra.numero}.`, req.ip);

    return res.json({ message: 'Quadra excluída com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao excluir quadra: ' + err.message });
  }
});

app.post('/api/quadras/:id/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, observacao } = req.body;

    if (!status || !['Pendente', 'Em Andamento', 'Feita'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const quadra = await getQuadraById(id);
    if (!quadra) {
      return res.status(404).json({ error: 'Quadra não encontrada.' });
    }

    const updates: any = { status };

    if (status === 'Feita') {
      updates.data_conclusao = new Date().toISOString();
      updates.usuario_id = req.user!.id;
      updates.usuario_nome = req.user!.nome;
    } else {
      updates.data_conclusao = null;
    }

    if (observacao !== undefined) {
      updates.observacao = observacao;
    }

    const updated = await updateQuadraDoc(id, updates);

    // Registrar no histórico
    const bairro = await getBairroById(String(quadra.bairro_id));
    await addHistoricoDocs({
      quadra_id: quadra.id,
      quadra_numero: quadra.numero,
      bairro_id: quadra.bairro_id,
      bairro_nome: bairro ? bairro.nome : 'Bairro',
      acao: status,
      usuario_id: req.user!.id,
      usuario_nome: req.user!.nome,
      data_hora: new Date().toISOString(),
      observacao: observacao || '',
    });

    // Recalcular bairro
    if (quadra.bairro_id) {
      const quadras = await getQuadras();
      const bairroQuadras = quadras.filter((q: any) => String(q.bairro_id) === String(quadra.bairro_id));
      const done = bairroQuadras.filter((q: any) => q.status === 'Feita').length;
      const total = bairroQuadras.length;
      const perc = total > 0 ? Math.round((done / total) * 100) : 0;

      await updateBairroDoc(String(quadra.bairro_id), {
        total_quadras: total,
        quadras_concluidas: done,
        percentual_concluido: perc,
        status: perc === 100 ? 'Concluído' : perc > 0 ? 'Em Andamento' : 'Não Iniciado',
      });
    }

    await addAuditLog(req.user!.id, req.user!.nome, 'Alterou Status Quadra', `Quadra ${quadra.numero} alterada para ${status}.`, req.ip);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao alterar status da quadra: ' + err.message });
  }
});

app.patch('/api/quadras/:id/toggle', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const quadra = await getQuadraById(id);
    if (!quadra) {
      return res.status(404).json({ error: 'Quadra não encontrada.' });
    }

    const newStatus = quadra.status === 'Feita' ? 'Pendente' : 'Feita';
    const updates: any = { status: newStatus };

    if (newStatus === 'Feita') {
      updates.data_conclusao = new Date().toISOString();
      updates.usuario_id = req.user!.id;
      updates.usuario_nome = req.user!.nome;
    } else {
      updates.data_conclusao = null;
    }

    const updated = await updateQuadraDoc(id, updates);

    // Registrar no histórico
    const bairro = await getBairroById(String(quadra.bairro_id));
    await addHistoricoDocs({
      quadra_id: quadra.id,
      quadra_numero: quadra.numero,
      bairro_id: quadra.bairro_id,
      bairro_nome: bairro ? bairro.nome : 'Bairro',
      acao: newStatus === 'Feita' ? 'Concluída' : 'Resetada',
      usuario_id: req.user!.id,
      usuario_nome: req.user!.nome,
      data_hora: new Date().toISOString(),
      observacao: '',
    });

    // Recalcular bairro
    if (quadra.bairro_id) {
      const quadras = await getQuadras();
      const bairroQuadras = quadras.filter((q: any) => String(q.bairro_id) === String(quadra.bairro_id));
      const done = bairroQuadras.filter((q: any) => q.status === 'Feita').length;
      const total = bairroQuadras.length;
      const perc = total > 0 ? Math.round((done / total) * 100) : 0;

      await updateBairroDoc(String(quadra.bairro_id), {
        total_quadras: total,
        quadras_concluidas: done,
        percentual_concluido: perc,
        status: perc === 100 ? 'Concluído' : perc > 0 ? 'Em Andamento' : 'Não Iniciado',
      });
    }

    await addAuditLog(req.user!.id, req.user!.nome, 'Alternou Status Quadra', `Quadra ${quadra.numero} alternada para ${newStatus}.`, req.ip);

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao alternar status da quadra: ' + err.message });
  }
});

app.get('/api/quadras/:id/historico', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const historico = await getHistorico();
    const filtered = historico.filter((h: any) => String(h.quadra_id) === String(id));
    return res.json(filtered);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar histórico da quadra: ' + err.message });
  }
});

// -------------------------------------------------------------
// ROTAS DE HISTÓRICO
// -------------------------------------------------------------
app.get('/api/historico', authenticateToken, async (req: Request, res: Response) => {
  try {
    const historico = await getHistorico();
    return res.json(historico);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar histórico: ' + err.message });
  }
});

// -------------------------------------------------------------
// ROTAS DE CARTÕES DE TERRITÓRIO
// -------------------------------------------------------------
app.get('/api/cartoes', authenticateToken, async (req: Request, res: Response) => {
  try {
    await syncAndCleanOrphanData();
    const cartoes = await getCartoes();
    const cartaoQuadras = await getCartaoQuadras();
    const quadras = await getQuadras();
    const bairros = await getBairros();
    const cidades = await getCidades();
    const users = await getUsers();
    const designacoes = await getCartaoDesignacoes();

    const bairrosMap = new Map(bairros.map((b: any) => [String(b.id), b]));
    const cidadesMap = new Map(cidades.map((c: any) => [String(c.id), c]));
    const usersMap = new Map(users.map((u: any) => [String(u.id), u]));

    const result = cartoes.map((c: any) => {
      const joins = cartaoQuadras.filter((cq: any) => String(cq.cartao_id) === String(c.id));
      const qIds = joins.map((j: any) => String(j.quadra_id));

      const myQuadras = quadras
        .filter((q: any) => qIds.includes(String(q.id)) || (q.cartao_id && String(q.cartao_id) === String(c.id)))
        .map((q: any) => {
          const b = bairrosMap.get(String(q.bairro_id));
          const cid = b ? cidadesMap.get(String(b.cidade_id)) : null;
          const u = q.usuario_id ? usersMap.get(String(q.usuario_id)) : null;

          return {
            ...q,
            id: q.id,
            numero: q.numero,
            status: q.status === 'Feita' ? 'Feita' : 'Não feita',
            bairroId: q.bairro_id,
            bairro_id: q.bairro_id,
            bairroNome: b ? b.nome : (q.bairro_nome || ''),
            bairro_nome: b ? b.nome : (q.bairro_nome || ''),
            cidadeId: cid ? cid.id : (b ? b.cidade_id : null),
            cidade_id: cid ? cid.id : (b ? b.cidade_id : null),
            cidadeNome: cid ? cid.nome : '',
            cidade_nome: cid ? cid.nome : '',
            usuarioId: q.usuario_id || null,
            usuario_id: q.usuario_id || null,
            usuarioNome: u ? u.nome : (q.usuario_nome || null),
            usuario_nome: u ? u.nome : (q.usuario_nome || null),
            concluidaEm: q.data_conclusao || q.concluida_em || null,
            data_conclusao: q.data_conclusao || q.concluida_em || null,
          };
        })
        .sort((a: any, b: any) => {
          const numA = parseInt(a.numero, 10);
          const numB = parseInt(b.numero, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a.numero || '').localeCompare(String(b.numero || ''));
        });

      const allQuadraIds = Array.from(new Set([...qIds, ...myQuadras.map((q: any) => String(q.id))]));

      const myDesigs = designacoes
        .filter((d: any) => String(d.cartao_id) === String(c.id))
        .map((d: any) => ({
          id: d.id,
          dirigenteNome: d.dirigente_nome || d.dirigenteNome || '',
          dataDesignacao: d.data_designacao || d.dataDesignacao || '',
          dataConclusao: d.data_conclusao || d.dataConclusao || null,
        }));

      const doneCount = myQuadras.filter((q: any) => q.status === 'Feita').length;

      const cartaoBairroId = c.bairro_id || c.bairroId;
      const cartaoCidadeId = c.cidade_id || c.cidadeId;
      const cartaoUserId = c.usuario_id || c.usuarioId;

      const bObj = cartaoBairroId ? bairrosMap.get(String(cartaoBairroId)) : null;
      const cObj = (cartaoCidadeId ? cidadesMap.get(String(cartaoCidadeId)) : null) || (bObj ? cidadesMap.get(String(bObj.cidade_id)) : null);
      const uObj = cartaoUserId ? usersMap.get(String(cartaoUserId)) : null;

      return {
        ...c,
        id: c.id,
        titulo: c.titulo,
        descricao: c.descricao || c.observacao || '',
        observacao: c.observacao || c.descricao || '',
        cor: c.cor || '#10B981',
        cidadeId: cObj ? cObj.id : (cartaoCidadeId || null),
        cidade_id: cObj ? cObj.id : (cartaoCidadeId || null),
        cidadeNome: cObj ? cObj.nome : (c.cidadeNome || c.cidade_nome || null),
        cidade_nome: cObj ? cObj.nome : (c.cidadeNome || c.cidade_nome || null),
        bairroId: bObj ? bObj.id : (cartaoBairroId || null),
        bairro_id: bObj ? bObj.id : (cartaoBairroId || null),
        bairroNome: bObj ? bObj.nome : (c.bairroNome || c.bairro_nome || null),
        bairro_nome: bObj ? bObj.nome : (c.bairroNome || c.bairro_nome || null),
        usuarioId: uObj ? uObj.id : (cartaoUserId || null),
        usuario_id: uObj ? uObj.id : (cartaoUserId || null),
        usuarioNome: uObj ? uObj.nome : (c.usuarioNome || c.usuario_nome || null),
        usuario_nome: uObj ? uObj.nome : (c.usuarioNome || c.usuario_nome || null),
        quadraIds: allQuadraIds,
        quadra_ids: allQuadraIds,
        quadras: myQuadras,
        totalQuadras: myQuadras.length,
        total_quadras: myQuadras.length,
        concluidasQuadras: doneCount,
        quadras_concluidas: doneCount,
        designacoes: myDesigs,
        createdAt: c.created_at || c.createdAt || null,
        created_at: c.created_at || c.createdAt || null,
        ultimaDataConcluida: c.ultima_data_concluida || c.ultimaDataConcluida || null,
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar cartões: ' + err.message });
  }
});

app.get('/api/cartoes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cartao = await getCartaoById(id);
    if (!cartao) {
      return res.status(404).json({ error: 'Cartão não encontrado.' });
    }

    const cartaoQuadras = await getCartaoQuadras();
    const quadras = await getQuadras();
    const joins = cartaoQuadras.filter((cq: any) => String(cq.cartao_id) === String(id));
    const qIds = joins.map((j: any) => String(j.quadra_id));
    const myQuadras = quadras.filter((q: any) => qIds.includes(String(q.id)));

    return res.json({
      ...cartao,
      quadras: myQuadras,
      quadraIds: qIds,
      totalQuadras: myQuadras.length,
      concluidasQuadras: myQuadras.filter((q: any) => q.status === 'Feita').length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar cartão: ' + err.message });
  }
});

app.post('/api/cartoes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      titulo,
      cor,
      observacao,
      descricao,
      cidadeId,
      cidade_id,
      cidadeNome,
      cidade_nome,
      bairroId,
      bairro_id,
      bairroNome,
      bairro_nome,
      usuarioId,
      usuario_id,
      quadra_ids,
      quadraIds,
      quadrasIniciaisInicio,
      quadrasIniciaisFim,
    } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'Título do cartão é obrigatório.' });
    }

    const loc = await getOrCreateBairro(
      cidadeId || cidade_id,
      bairroId || bairro_id,
      cidadeNome || cidade_nome,
      bairroNome || bairro_nome
    );

    const resolvedUserId = usuarioId !== undefined ? usuarioId : (usuario_id !== undefined ? usuario_id : null);
    let resolvedUserNome = '';
    if (resolvedUserId) {
      const u = await getUserById(String(resolvedUserId));
      if (u) resolvedUserNome = u.nome;
    }

    const newCartao = await createCartaoDoc({
      titulo: titulo.trim(),
      descricao: (descricao || observacao || '').trim(),
      observacao: (observacao || descricao || '').trim(),
      cor: cor || '#10B981',
      cidade_id: String(loc.cidadeId),
      cidade_nome: loc.cidadeNome,
      bairro_id: String(loc.bairroId),
      bairro_nome: loc.bairroNome,
      usuario_id: resolvedUserId ? String(resolvedUserId) : null,
      usuario_nome: resolvedUserNome,
    });

    const targetQuadraIds = new Set<string>();

    const explicitQuadras = quadraIds || quadra_ids;
    if (Array.isArray(explicitQuadras)) {
      explicitQuadras.forEach((qId: any) => {
        if (qId) targetQuadraIds.add(String(qId));
      });
    }

    if (quadrasIniciaisInicio !== undefined && quadrasIniciaisFim !== undefined) {
      const start = Number(quadrasIniciaisInicio);
      const end = Number(quadrasIniciaisFim);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        const allQuadras = await getQuadras();

        for (let i = start; i <= end; i++) {
          const numStr = String(i);
          let match = allQuadras.find(
            (q: any) => String(q.bairro_id) === String(loc.bairroId) && String(q.numero) === numStr
          );
          if (!match) {
            match = await createQuadraDoc({
              numero: numStr,
              bairro_id: String(loc.bairroId),
              status: 'Pendente',
              cartao_id: newCartao.id,
            });
          } else {
            await updateQuadraDoc(String(match.id), { cartao_id: newCartao.id });
          }
          targetQuadraIds.add(String(match.id));
        }
      }
    }

    if (targetQuadraIds.size > 0) {
      const joins = Array.from(targetQuadraIds).map((qId) => ({
        cartao_id: newCartao.id,
        quadra_id: qId,
      }));
      await addCartaoQuadras(joins);

      // Também atualiza o cartao_id nas quadras vinculadas
      for (const qId of Array.from(targetQuadraIds)) {
        await updateQuadraDoc(String(qId), { cartao_id: newCartao.id });
      }
    }

    // Se tiver usuário atribuído, registra no histórico de designações
    if (resolvedUserId && resolvedUserNome) {
      try {
        const today = new Date();
        const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        await addCartaoDesignacoes([{
          cartao_id: String(newCartao.id),
          usuario_id: String(resolvedUserId),
          usuario_nome: resolvedUserNome,
          dirigente_nome: resolvedUserNome,
          data_designacao: formattedDate,
          data_conclusao: null,
          status: 'Ativo',
        }]);
      } catch (desigErr) {
        console.error('Erro ao registrar histórico de designação inicial:', desigErr);
      }
    }

    await addAuditLog(req.user!.id, req.user!.nome, 'Criou Cartão', `Criou o cartão ${newCartao.titulo}.`, req.ip);

    return res.status(201).json({
      ...newCartao,
      cidadeId: loc.cidadeId,
      cidade_id: loc.cidadeId,
      cidadeNome: loc.cidadeNome,
      cidade_nome: loc.cidadeNome,
      bairroId: loc.bairroId,
      bairro_id: loc.bairroId,
      bairroNome: loc.bairroNome,
      bairro_nome: loc.bairroNome,
      usuarioId: resolvedUserId,
      usuario_id: resolvedUserId,
      usuarioNome: resolvedUserNome,
      usuario_nome: resolvedUserNome,
      quadraIds: Array.from(targetQuadraIds),
      quadras_ids: Array.from(targetQuadraIds),
    });
  } catch (err: any) {
    console.error('Erro ao criar cartão:', err);
    return res.status(500).json({ error: 'Erro ao criar cartão: ' + err.message });
  }
});

app.put('/api/cartoes/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      cor,
      observacao,
      descricao,
      cidadeId,
      cidade_id,
      cidadeNome,
      cidade_nome,
      bairroId,
      bairro_id,
      bairroNome,
      bairro_nome,
      usuarioId,
      usuario_id,
      quadra_ids,
      quadraIds,
    } = req.body;

    const updates: any = {};
    if (titulo) updates.titulo = titulo.trim();
    if (cor) updates.cor = cor;
    if (descricao !== undefined) updates.descricao = descricao;
    if (observacao !== undefined) updates.observacao = observacao;
    if (cidadeId !== undefined || cidade_id !== undefined) updates.cidade_id = (cidadeId || cidade_id) ? String(cidadeId || cidade_id) : null;
    if (cidadeNome !== undefined || cidade_nome !== undefined) updates.cidade_nome = cidadeNome || cidade_nome || '';
    if (bairroId !== undefined || bairro_id !== undefined) updates.bairro_id = (bairroId || bairro_id) ? String(bairroId || bairro_id) : null;
    if (bairroNome !== undefined || bairro_nome !== undefined) updates.bairro_nome = bairroNome || bairro_nome || '';
    if (usuarioId !== undefined || usuario_id !== undefined) {
      const uId = usuarioId !== undefined ? usuarioId : usuario_id;
      const cleanUId = (uId !== null && uId !== undefined && String(uId).trim() !== '' && String(uId) !== 'null' && String(uId) !== 'undefined') ? String(uId) : null;
      updates.usuario_id = cleanUId;
      if (cleanUId) {
        const u = await getUserById(cleanUId);
        updates.usuario_nome = u ? u.nome : '';

        try {
          const allDesigs = await getCartaoDesignacoes();
          const existingForThisCartaoAndUser = allDesigs.find(
            (d: any) => String(d.cartao_id) === String(id) && ((d.dirigente_nome && u && d.dirigente_nome === u.nome) || String(d.usuario_id) === cleanUId) && !d.data_conclusao
          );
          if (!existingForThisCartaoAndUser && u) {
            const today = new Date();
            const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            await addCartaoDesignacoes([{
              cartao_id: String(id),
              usuario_id: cleanUId,
              usuario_nome: u.nome,
              dirigente_nome: u.nome,
              data_designacao: formattedDate,
              data_conclusao: null,
              status: 'Ativo',
            }]);
          }
        } catch (desigErr) {
          console.error('Erro ao registrar histórico de designação:', desigErr);
        }
      } else {
        updates.usuario_nome = '';
      }
    }

    const updated = await updateCartaoDoc(id, updates);

    const targetQuadras = quadraIds !== undefined ? quadraIds : quadra_ids;
    if (Array.isArray(targetQuadras)) {
      await deleteCartaoQuadrasByCartaoId(id);
      if (targetQuadras.length > 0) {
        const joins = targetQuadras.map((qId: any) => ({
          cartao_id: id,
          quadra_id: String(qId),
        }));
        await addCartaoQuadras(joins);
      }
    }

    await addAuditLog(req.user!.id, req.user!.nome, 'Atualizou Cartão', `Atualizou cartão ${updated.titulo}.`, req.ip);

    const cartaoUserId = updated.usuario_id || updated.usuarioId;
    let uNome = updated.usuario_nome || updated.usuarioNome || null;
    if (cartaoUserId && !uNome) {
      const u = await getUserById(String(cartaoUserId));
      if (u) uNome = u.nome;
    }

    return res.json({
      ...updated,
      usuarioId: cartaoUserId || null,
      usuario_id: cartaoUserId || null,
      usuarioNome: uNome,
      usuario_nome: uNome,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar cartão: ' + err.message });
  }
});

app.delete('/api/cartoes/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cartao = await getCartaoById(id);
    if (!cartao) {
      return res.status(404).json({ error: 'Cartão não encontrado.' });
    }

    // 1. Delete all quadras linked to this cartao
    const cartaoQuadras = await getCartaoQuadras();
    const joins = cartaoQuadras.filter((cq: any) => String(cq.cartao_id) === String(id));
    const linkedQuadraIds = new Set<string>(joins.map((j: any) => String(j.quadra_id)));

    const allQuadras = await getQuadras();
    allQuadras.filter((q: any) => String(q.cartao_id) === String(id)).forEach((q: any) => {
      linkedQuadraIds.add(String(q.id));
    });

    for (const qId of Array.from(linkedQuadraIds)) {
      await deleteQuadraDoc(qId);
    }

    await deleteCartaoQuadrasByCartaoId(id);
    await deleteCartaoDesignacoesByCartaoId(id);
    await deleteCartaoDoc(id);

    // 2. Perform global sync and cleanup of orphan quadras and empty bairros
    await syncAndCleanOrphanData();

    await addAuditLog(req.user!.id, req.user!.nome, 'Excluiu Cartão', `Excluiu cartão ${cartao.titulo}.`, req.ip);

    return res.json({ message: 'Cartão excluído com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao excluir cartão: ' + err.message });
  }
});

// Criar e vincular quadras a um cartão específico
app.post('/api/cartoes/:id/quadras', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quadra_id, quadraId, quadra_ids, quadraIds, numero, inicio, fim, numeros } = req.body;

    const cartao = await getCartaoById(id);
    if (!cartao) {
      return res.status(404).json({ error: 'Cartão não encontrado.' });
    }

    const joins = await getCartaoQuadras();
    const existingForCartao = new Set(
      joins.filter((j: any) => String(j.cartao_id) === String(id)).map((j: any) => String(j.quadra_id))
    );

    let countCriadas = 0;
    const toLinkIds: string[] = [];

    if (quadra_id || quadraId) {
      toLinkIds.push(String(quadra_id || quadraId));
    } else if (Array.isArray(quadra_ids || quadraIds)) {
      (quadra_ids || quadraIds).forEach((qId: any) => toLinkIds.push(String(qId)));
    }

    const numbersToCreate: string[] = [];
    if (numero && String(numero).trim()) {
      numbersToCreate.push(String(numero).trim());
    } else if (inicio !== undefined && fim !== undefined) {
      const start = Number(inicio);
      const end = Number(fim);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          numbersToCreate.push(String(i));
        }
      }
    } else if (Array.isArray(numeros) && numeros.length > 0) {
      numeros.forEach((n: any) => {
        if (n !== undefined && String(n).trim()) numbersToCreate.push(String(n).trim());
      });
    }

    if (numbersToCreate.length > 0) {
      const loc = await getOrCreateBairro(
        cartao.cidade_id || cartao.cidadeId,
        cartao.bairro_id || cartao.bairroId,
        cartao.cidade_nome || cartao.cidadeNome,
        cartao.bairro_nome || cartao.bairroNome
      );

      const allQuadras = await getQuadras();
      for (const numStr of numbersToCreate) {
        let existing = allQuadras.find(
          (q: any) => String(q.bairro_id) === String(loc.bairroId) && String(q.numero) === numStr
        );

        if (!existing) {
          existing = await createQuadraDoc({
            numero: numStr,
            bairro_id: String(loc.bairroId),
            status: 'Pendente',
            cartao_id: id,
          });
          countCriadas++;
        } else {
          await updateQuadraDoc(String(existing.id), { cartao_id: id });
        }
        toLinkIds.push(String(existing.id));
      }

      const refreshedQuadras = await getQuadras();
      const bQuadras = refreshedQuadras.filter((q: any) => String(q.bairro_id) === String(loc.bairroId));
      const done = bQuadras.filter((q: any) => q.status === 'Feita').length;
      const total = bQuadras.length;
      const perc = total > 0 ? Math.round((done / total) * 100) : 0;

      await updateBairroDoc(String(loc.bairroId), {
        total_quadras: total,
        quadras_concluidas: done,
        percentual_concluido: perc,
      });
    }

    const newJoinsToAdd: { cartao_id: string; quadra_id: string }[] = [];
    for (const qId of toLinkIds) {
      if (!existingForCartao.has(qId)) {
        newJoinsToAdd.push({ cartao_id: id, quadra_id: qId });
        existingForCartao.add(qId);
        await updateQuadraDoc(String(qId), { cartao_id: id });
      }
    }

    if (newJoinsToAdd.length > 0) {
      await addCartaoQuadras(newJoinsToAdd);
    }

    await addAuditLog(
      req.user!.id,
      req.user!.nome,
      'Vinculou Quadras ao Cartão',
      `Vinculou ${newJoinsToAdd.length} quadras ao cartão ${cartao.titulo}.`,
      req.ip
    );

    return res.json({
      message: `${newJoinsToAdd.length} quadras vinculadas ao cartão com sucesso.`,
      countCriadas,
      countVinculadas: newJoinsToAdd.length,
      cartao: {
        ...cartao,
        quadraIds: Array.from(existingForCartao),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar/vincular quadras ao cartão: ' + err.message });
  }
});

app.delete('/api/cartoes/:id/quadras/:quadraId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, quadraId } = req.params;
    const joins = await getCartaoQuadras();
    const found = joins.find((j: any) => String(j.cartao_id) === String(id) && String(j.quadra_id) === String(quadraId));

    if (found) {
      await deleteCartaoQuadrasByCartaoId(id);
      const remaining = joins.filter(
        (j: any) => String(j.cartao_id) === String(id) && String(j.quadra_id) !== String(quadraId)
      );
      if (remaining.length > 0) {
        await addCartaoQuadras(remaining.map((r: any) => ({ cartao_id: id, quadra_id: r.quadra_id })));
      }
    }

    return res.json({ message: 'Quadra desvinculada com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao desvincular quadra: ' + err.message });
  }
});

app.patch('/api/cartoes/:cartaoId/quadras/:quadraId/toggle', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { cartaoId, quadraId } = req.params;
    const joins = await getCartaoQuadras();
    const exists = joins.some((j: any) => String(j.cartao_id) === String(cartaoId) && String(j.quadra_id) === String(quadraId));

    if (exists) {
      await deleteCartaoQuadrasByCartaoId(cartaoId);
      const remaining = joins.filter(
        (j: any) => String(j.cartao_id) === String(cartaoId) && String(j.quadra_id) !== String(quadraId)
      );
      if (remaining.length > 0) {
        await addCartaoQuadras(remaining.map((r: any) => ({ cartao_id: cartaoId, quadra_id: r.quadra_id })));
      }
    } else {
      await addCartaoQuadras([{ cartao_id: cartaoId, quadra_id: String(quadraId) }]);
    }

    const quadra = await getQuadraById(quadraId);
    return res.json(quadra || { id: quadraId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao alternar quadra no cartão: ' + err.message });
  }
});

app.put('/api/cartoes/:id/designacoes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { designacoes, ultimaDataConcluida } = req.body;

    if (ultimaDataConcluida !== undefined) {
      await updateCartaoDoc(id, { ultima_data_concluida: ultimaDataConcluida });
    }

    if (Array.isArray(designacoes)) {
      await deleteCartaoDesignacoesByCartaoId(id);
      if (designacoes.length > 0) {
        const rows = designacoes.map((d: any) => ({
          cartao_id: String(id),
          usuario_id: d.usuario_id ? String(d.usuario_id) : (d.usuarioId ? String(d.usuarioId) : ''),
          usuario_nome: d.dirigenteNome || d.dirigente_nome || d.usuario_nome || d.usuarioNome || 'Dirigente',
          dirigente_nome: d.dirigenteNome || d.dirigente_nome || d.usuario_nome || d.usuarioNome || 'Dirigente',
          data_designacao: d.dataDesignacao || d.data_designacao || new Date().toISOString(),
          data_conclusao: d.dataConclusao || d.data_conclusao || d.data_devolucao || null,
          data_devolucao: d.dataConclusao || d.data_conclusao || d.data_devolucao || null,
          status: d.status || (d.dataConclusao || d.data_conclusao ? 'Concluído' : 'Ativo'),
        }));
        await addCartaoDesignacoes(rows);
      }
    }

    const updated = await getCartaoById(id);
    return res.json(updated || { message: 'Designações atualizadas com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao atualizar designações: ' + err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD E RELATÓRIOS
// -------------------------------------------------------------
app.get('/api/dashboard/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    await syncAndCleanOrphanData();
    const cidades = await getCidades();
    const bairros = await getBairros();
    const quadras = await getQuadras();

    const totalCidades = cidades.length;
    const totalQuadras = quadras.length;
    const quadrasConcluidas = quadras.filter((q: any) => q.status === 'Feita').length;
    const quadrasPendentes = totalQuadras - quadrasConcluidas;
    const percentualConcluido = totalQuadras > 0 ? Math.round((quadrasConcluidas / totalQuadras) * 100) : 0;

    const progressoPorCidade = cidades.map((c: any) => {
      const cBairros = bairros.filter((b: any) => String(b.cidade_id) === String(c.id));
      const cBairroIds = cBairros.map((b: any) => String(b.id));
      const cQuadras = quadras.filter((q: any) => cBairroIds.includes(String(q.bairro_id)) || String(q.cidade_id) === String(c.id));
      const done = cQuadras.filter((q: any) => q.status === 'Feita').length;
      const total = cQuadras.length;
      return {
        cidade: c.nome,
        total,
        concluidas: done,
        percentual: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });

    const userCountMap = new Map<string, number>();
    quadras.forEach((q: any) => {
      if (q.status === 'Feita' && q.usuario_nome) {
        userCountMap.set(q.usuario_nome, (userCountMap.get(q.usuario_nome) || 0) + 1);
      }
    });

    const progressoPorUsuario = Array.from(userCountMap.entries())
      .map(([usuario, totalConcluidas]) => ({ usuario, totalConcluidas }))
      .sort((a, b) => b.totalConcluidas - a.totalConcluidas);

    return res.json({
      totalCidades,
      totalQuadras,
      quadrasConcluidas,
      quadrasPendentes,
      percentualConcluido,
      progressoPorCidade,
      progressoPorUsuario,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard: ' + err.message });
  }
});

app.get('/api/relatorios', authenticateToken, async (req: Request, res: Response) => {
  try {
    const cidades = await getCidades();
    const bairros = await getBairros();
    const quadras = await getQuadras();
    const users = await getUsers();

    const totalQuadras = quadras.length;
    const quadrasConcluidas = quadras.filter((q: any) => q.status === 'Feita').length;
    const quadrasPendentes = totalQuadras - quadrasConcluidas;
    const percentualGeral = totalQuadras > 0 ? Math.round((quadrasConcluidas / totalQuadras) * 100) : 0;

    let maxCidadePerc = -1;
    let cidadeMaisAvançada = 'Nenhuma';
    cidades.forEach((c: any) => {
      const cBairros = bairros.filter((b: any) => String(b.cidade_id) === String(c.id));
      const cBairroIds = cBairros.map((b: any) => String(b.id));
      const cQuadras = quadras.filter((q: any) => cBairroIds.includes(String(q.bairro_id)) || String(q.cidade_id) === String(c.id));
      if (cQuadras.length > 0) {
        const done = cQuadras.filter((q: any) => q.status === 'Feita').length;
        const perc = Math.round((done / cQuadras.length) * 100);
        if (perc > maxCidadePerc) {
          maxCidadePerc = perc;
          cidadeMaisAvançada = `${c.nome} (${perc}%)`;
        }
      }
    });

    const userMap = new Map<string, { usuarioId: any; nome: string; usuario: string; permissao: string; quadrasFeitas: number }>();
    users.forEach((u: any) => {
      userMap.set(String(u.id), {
        usuarioId: u.id,
        nome: u.nome,
        usuario: u.usuario,
        permissao: u.permissao,
        quadrasFeitas: 0,
      });
    });

    quadras.forEach((q: any) => {
      if (q.status === 'Feita' && q.usuario_id) {
        const existing = userMap.get(String(q.usuario_id));
        if (existing) {
          existing.quadrasFeitas += 1;
        } else if (q.usuario_nome) {
          userMap.set(String(q.usuario_id), {
            usuarioId: q.usuario_id,
            nome: q.usuario_nome,
            usuario: q.usuario_nome,
            permissao: 'Usuário',
            quadrasFeitas: 1,
          });
        }
      }
    });

    const userStats = Array.from(userMap.values())
      .filter((u) => u.quadrasFeitas > 0)
      .sort((a, b) => b.quadrasFeitas - a.quadrasFeitas);

    return res.json({
      geradoEm: new Date().toISOString(),
      totalQuadras,
      quadrasConcluidas,
      quadrasPendentes,
      percentualConcluido: percentualGeral,
      percentualGeral,
      cidadeMaisAvançada,
      tempoMedioEstimado: '2 a 4 semanas',
      userStats,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar relatórios: ' + err.message });
  }
});

app.get('/api/auditoria', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await getAuditLogs();
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao buscar logs de auditoria: ' + err.message });
  }
});

app.get('/api/relatorios/resumo', authenticateToken, async (req: Request, res: Response) => {
  try {
    const cidades = await getCidades();
    const bairros = await getBairros();
    const quadras = await getQuadras();
    const cartoes = await getCartoes();

    const totalCidades = cidades.length;
    const totalQuadras = quadras.length;
    const quadrasConcluidas = quadras.filter((q: any) => q.status === 'Feita').length;
    const totalCartoes = cartoes.length;

    const quadrasPorCidade = cidades.map((c: any) => {
      const cBairros = bairros.filter((b: any) => String(b.cidade_id) === String(c.id));
      const cBairroIds = cBairros.map((b: any) => String(b.id));
      const cQuadras = quadras.filter((q: any) => cBairroIds.includes(String(q.bairro_id)) || String(q.cidade_id) === String(c.id));
      const done = cQuadras.filter((q: any) => q.status === 'Feita').length;

      return {
        cidade: c.nome,
        total: cQuadras.length,
        concluidas: done,
      };
    });

    const userMap = new Map<string, number>();
    quadras.forEach((q: any) => {
      if (q.status === 'Feita' && q.usuario_nome) {
        userMap.set(q.usuario_nome, (userCountMapFallback(userMap, q.usuario_nome) || 0) + 1);
      }
    });

    const maioresTrabalhadores = Array.from(userMap.entries())
      .map(([nome, quadrasConcluidas]) => ({ nome, quadrasConcluidas }))
      .sort((a, b) => b.quadrasConcluidas - a.quadrasConcluidas)
      .slice(0, 5);

    return res.json({
      totalCidades,
      totalQuadras,
      quadrasConcluidas,
      totalCartoes,
      quadrasPorCidade,
      maioresTrabalhadores,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar resumo de relatórios: ' + err.message });
  }
});

function userCountMapFallback(map: Map<string, number>, key: string): number {
  return map.get(key) || 0;
}

app.get('/api/relatorios/cidades', authenticateToken, async (req: Request, res: Response) => {
  try {
    const cidades = await getCidades();
    const bairros = await getBairros();
    const quadras = await getQuadras();

    const result = cidades.map((c: any) => {
      const cBairros = bairros.filter((b: any) => String(b.cidade_id) === String(c.id));
      const cBairroIds = cBairros.map((b: any) => String(b.id));
      const cQuadras = quadras.filter((q: any) => cBairroIds.includes(String(q.bairro_id)) || String(q.cidade_id) === String(c.id));

      const total = cQuadras.length;
      const done = cQuadras.filter((q: any) => q.status === 'Feita').length;
      const pend = total - done;
      const perc = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        cidadeId: c.id,
        cidadeNome: c.nome,
        totalQuadras: total,
        quadrasConcluidas: done,
        quadrasPendentes: pend,
        percentual: perc,
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar relatório por cidade: ' + err.message });
  }
});

app.get('/api/relatorios/bairros', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bairros = await getBairros();
    const cidades = await getCidades();
    const quadras = await getQuadras();

    const cidadesMap = new Map(cidades.map((c: any) => [c.id, c.nome]));

    const total = quadras.length;
    const conc = quadras.filter((q: any) => q.status === 'Feita').length;
    const pend = total - conc;
    const percGeral = total > 0 ? Math.round((conc / total) * 100) : 0;

    const relatorioBairros = bairros.map((b: any) => {
      const bQuadras = quadras.filter((q: any) => String(q.bairro_id) === String(b.id));
      const totalB = bQuadras.length;
      const doneB = bQuadras.filter((q: any) => q.status === 'Feita').length;
      const pendB = totalB - doneB;
      const percB = totalB > 0 ? Math.round((doneB / totalB) * 100) : 0;

      return {
        bairroId: b.id,
        bairroNome: b.nome,
        cidadeNome: cidadesMap.get(b.cidade_id) || 'Cidade',
        total: totalB,
        concluidas: doneB,
        pendentes: pendB,
        percentual: percB,
      };
    });

    return res.json({
      geradoEm: new Date().toISOString(),
      totalQuadras: total,
      quadrasConcluidas: conc,
      quadrasPendentes: pend,
      percentualGeral: percGeral,
      relatorioBairros,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar relatório por bairro: ' + err.message });
  }
});

// Middleware de Erro Global Express
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erro na API Express:', err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno no servidor.',
  });
});

export default app;
