import {
  User,
  Cidade,
  Bairro,
  Quadra,
  Cartao,
  QuadraHistorico,
  AuditLog,
  DashboardStats,
  ReportData,
} from '../types';

const TOKEN_KEY = 'quadras_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getApiBaseUrl(): string {
  const metaEnv = (import.meta as any).env || {};
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};
  const customUrl =
    metaEnv.VITE_API_URL ||
    metaEnv.NEXT_PUBLIC_API_URL ||
    procEnv.VITE_API_URL ||
    procEnv.NEXT_PUBLIC_API_URL ||
    '';

  if (!customUrl) return '';

  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(customUrl);
      if (parsed.origin === window.location.origin) {
        return '';
      }
    } catch (_e) {
      return '';
    }

    // In local development, Cloud Run containers, or same-origin hosts, relative URLs work directly
    if (
      window.location.hostname.includes('run.app') ||
      window.location.hostname.includes('localhost') ||
      window.location.hostname.includes('127.0.0.1')
    ) {
      return '';
    }
  }

  return customUrl.replace(/\/$/, '');
}

export async function safeJson(response: Response): Promise<any> {
  const text = await response.text();
  if (!text || !text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (_e) {
    return { message: text };
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = baseUrl
    ? `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
    : endpoint;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.error("Erro de requisição/conexão ao servidor:", err);
    throw new Error('Não foi possível conectar ao servidor backend. Verifique a conexão com a internet ou as rotas de API.');
  }

  const responseText = await response.text();

  if (!responseText || !responseText.trim()) {
    if (!response.ok) {
      throw new Error(`O servidor retornou uma resposta vazia (Status: ${response.status})`);
    }
    return {} as T;
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (_e) {
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText || 'Resposta em formato inválido'}`);
    }
    data = { message: responseText };
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
      clearStoredToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth_unauthorized'));
      }
    }
    const errorMsg =
      data && typeof data === 'object' && data.error
        ? data.error
        : `Erro ${response.status}: ${response.statusText || 'Ocorreu um erro na requisição.'}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: async (usuario: string, senha: string) => {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, senha }),
    });
    setStoredToken(res.token);
    return res;
  },

  register: async (data: {
    usuario: string;
    email: string;
    senha: string;
    confirmarSenha: string;
  }) => {
    const res = await request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      clearStoredToken();
    }
  },

  getMe: async () => {
    return request<User>('/api/auth/me');
  },

  googleLogin: async (data: { email?: string | null; name?: string | null; uid?: string }) => {
    const res = await request<{ token: string; user: User }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  recoverPassword: async (usuario: string) => {
    return request<{ message: string }>('/api/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify({ usuario }),
    });
  },

  setUserCity: async (data: { cidadeNome: string; cidadeId?: string | number }) => {
    return request<{ message: string; user: User; cidade: Cidade }>('/api/auth/cidade', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Users (Admin)
  getUsers: async () => request<User[]>('/api/users'),
  createUser: async (user: Omit<User, 'id'> & { senha: string }) =>
    request<User>('/api/users', { method: 'POST', body: JSON.stringify(user) }),
  updateUser: async (id: number | string, user: Partial<User> & { senha?: string }) =>
    request<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(user) }),
  deleteUser: async (id: number | string) =>
    request<{ message: string }>(`/api/users/${id}`, { method: 'DELETE' }),

  // Cidades
  getCidades: async () => request<Cidade[]>('/api/cidades'),
  createCidade: async (nome: string) =>
    request<Cidade>('/api/cidades', {
      method: 'POST',
      body: JSON.stringify({ nome }),
    }),
  updateCidade: async (id: number | string, nome: string) =>
    request<Cidade>(`/api/cidades/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ nome }),
    }),
  deleteCidade: async (id: number | string) =>
    request<{ message: string }>(`/api/cidades/${id}`, { method: 'DELETE' }),

  // Bairros
  getBairros: async (cidadeId?: string | number) => {
    const query = cidadeId ? `?cidadeId=${cidadeId}` : '';
    return request<Bairro[]>(`/api/bairros${query}`);
  },
  createBairro: async (cidadeId: number | string, nome: string) =>
    request<Bairro>('/api/bairros', {
      method: 'POST',
      body: JSON.stringify({ cidadeId, nome }),
    }),
  updateBairro: async (id: number | string, data: { nome?: string; cidadeId?: number | string }) =>
    request<Bairro>(`/api/bairros/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteBairro: async (id: number | string) =>
    request<{ message: string }>(`/api/bairros/${id}`, { method: 'DELETE' }),
  resetBairro: async (id: number | string) =>
    request<{ message: string; countReset: number }>(`/api/bairros/${id}/reset`, {
      method: 'POST',
    }),

  // Quadras
  getQuadras: async (filters?: {
    cidadeId?: string | number;
    bairroId?: string | number;
    status?: string;
    usuarioId?: string | number;
    numero?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.cidadeId) params.append('cidadeId', String(filters.cidadeId));
    if (filters?.bairroId) params.append('bairroId', String(filters.bairroId));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.usuarioId) params.append('usuarioId', String(filters.usuarioId));
    if (filters?.numero) params.append('numero', filters.numero);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return request<Quadra[]>(`/api/quadras${query}`);
  },
  createQuadra: async (cidadeId: number | string, bairroId: number | string, numero: string) =>
    request<Quadra>('/api/quadras', {
      method: 'POST',
      body: JSON.stringify({ cidadeId, bairroId, numero }),
    }),
  createQuadrasBulk: async (
    cidadeId: number | string,
    bairroId: number | string,
    inicio: number,
    fim: number
  ) =>
    request<{ message: string; count: number }>('/api/quadras/bulk', {
      method: 'POST',
      body: JSON.stringify({ cidadeId, bairroId, inicio, fim }),
    }),
  updateQuadra: async (id: number | string, numero: string) =>
    request<Quadra>(`/api/quadras/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ numero }),
    }),
  deleteQuadra: async (id: number | string) =>
    request<{ message: string }>(`/api/quadras/${id}`, { method: 'DELETE' }),
  toggleQuadra: async (id: number | string) =>
    request<Quadra>(`/api/quadras/${id}/toggle`, { method: 'PATCH' }),
  getQuadraHistorico: async (id: number | string) =>
    request<QuadraHistorico[]>(`/api/quadras/${id}/historico`),

  // Cartões
  getCartoes: async () => request<Cartao[]>('/api/cartoes'),
  getCartao: async (id: number | string) => request<Cartao>(`/api/cartoes/${id}`),
  createCartao: async (data: {
    titulo: string;
    descricao?: string;
    cidadeId?: number | string | null;
    bairroId?: number | string | null;
    usuarioId?: number | string | null;
    quadraIds: (number | string)[];
    quadrasIniciaisInicio?: number;
    quadrasIniciaisFim?: number;
  }) =>
    request<Cartao>('/api/cartoes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCartao: async (
    id: number | string,
    data: {
      titulo?: string;
      descricao?: string;
      cidadeId?: number | string | null;
      bairroId?: number | string | null;
      usuarioId?: number | string | null;
      quadraIds?: (number | string)[];
    }
  ) =>
    request<Cartao>(`/api/cartoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCartao: async (id: number | string) =>
    request<{ message: string }>(`/api/cartoes/${id}`, { method: 'DELETE' }),
  createQuadrasParaCartao: async (
    cartaoId: number | string,
    data: { numero?: string; inicio?: number; fim?: number; numeros?: string[] }
  ) =>
    request<{ cartao: Cartao; countCriadas: number }>(`/api/cartoes/${cartaoId}/quadras`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleCartaoQuadra: async (cartaoId: number | string, quadraId: number | string) =>
    request<Quadra>(`/api/cartoes/${cartaoId}/quadras/${quadraId}/toggle`, {
      method: 'PATCH',
    }),
  updateCartaoDesignacoes: async (
    cartaoId: number | string,
    data: {
      designacoes: any[];
      ultimaDataConcluida?: string | null;
    }
  ) =>
    request<Cartao>(`/api/cartoes/${cartaoId}/designacoes`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Dashboard & Reports & Audit
  getDashboardStats: async () => request<DashboardStats>('/api/dashboard/stats'),
  getRelatorios: async () => request<ReportData>('/api/relatorios'),
  getAuditoria: async (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<AuditLog[]>(`/api/auditoria${query}`);
  },
};
