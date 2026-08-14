import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';
import {
  Lock,
  User as UserIcon,
  ShieldCheck,
  Building2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Mail,
  UserPlus,
  LogIn,
  ArrowRight,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Sign-in state
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');

  // Sign-up state
  const [regUsuario, setRegUsuario] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmarSenha, setRegConfirmarSenha] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Recovery modal state
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryUser, setRecoveryUser] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  // Traditional Login via Supabase Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !senha.trim()) {
      setError('Por favor, preencha o usuário/e-mail e a senha.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(usuario.trim(), senha.trim());
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  // Sign-up / Cadastro
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regUsuario.trim() || !regEmail.trim() || !regSenha.trim() || !regConfirmarSenha.trim()) {
      setError('Por favor, preencha todos os campos do formulário de cadastro.');
      return;
    }

    if (regSenha !== regConfirmarSenha) {
      setError('A senha e a confirmação de senha não coincidem. Digite novamente.');
      return;
    }

    if (regSenha.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.register({
        usuario: regUsuario.trim(),
        email: regEmail.trim(),
        senha: regSenha.trim(),
        confirmarSenha: regConfirmarSenha.trim(),
      });

      setSuccessMsg('Cadastro realizado com sucesso! Conectando...');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In / Up via Firebase Auth
  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const res = await api.googleLogin({
        email: user.email,
        name: user.displayName || user.email?.split('@')[0],
        uid: user.uid,
      });
      onLoginSuccess(res.user);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Erro ao autenticar com o Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const fillDemo = (user: string, pass: string) => {
    setActiveTab('login');
    setUsuario(user);
    setSenha(pass);
    setError(null);
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUser.trim()) {
      setRecoveryError('Informe o seu nome de usuário ou e-mail.');
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoveryMsg(null);

    try {
      const res = await api.recoverPassword(recoveryUser.trim());
      setRecoveryMsg(res.message);
    } catch (err: any) {
      setRecoveryError(err.message || 'Não foi possível solicitar a recuperação.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-3 shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Controle de Quadras
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de visitas e mapeamento em bairros e cidades
          </p>
        </div>

        {/* Navigation Tabs (Login / Cadastro) */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl mb-6 border border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar-se
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* ================= LOGIN FORM ================= */}
        {activeTab === 'login' && (
          <div className="space-y-5">
            {/* Featured Google Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl shadow-md transition-all flex justify-center items-center gap-3 text-xs sm:text-sm cursor-pointer border border-slate-200 active:scale-[0.99] disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-700 border-t-transparent" />
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Login com Google</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-slate-700/80 w-full" />
              <span className="bg-slate-800 px-3 text-[10px] uppercase font-bold text-slate-500 shrink-0 tracking-wider">
                ou entre com credenciais
              </span>
              <div className="border-t border-slate-700/80 w-full" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  E-mail ou Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Ex: admin ou admin@quadras.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRecovery(true)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 active:scale-[0.99] transition-all flex justify-center items-center gap-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer mt-2"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Entrar no Sistema
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= REGISTER FORM ================= */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            {/* Cadastrar com Google */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl shadow-md transition-all flex justify-center items-center gap-3 text-xs sm:text-sm cursor-pointer border border-slate-200 active:scale-[0.99] disabled:opacity-60"
            >
              {googleLoading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-700 border-t-transparent" />
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Cadastrar com Google</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-slate-700/80 w-full" />
              <span className="bg-slate-800 px-3 text-[10px] uppercase font-bold text-slate-500 shrink-0 tracking-wider">
                ou preencha seus dados
              </span>
              <div className="border-t border-slate-700/80 w-full" />
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Nome de usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regUsuario}
                    onChange={(e) => setRegUsuario(e.target.value)}
                    placeholder="Ex: joaosilva"
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Ex: joao@exemplo.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={regSenha}
                    onChange={(e) => setRegSenha(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Confirmar senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={regConfirmarSenha}
                    onChange={(e) => setRegConfirmarSenha(e.target.value)}
                    placeholder="Repita a senha para confirmar"
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/50 active:scale-[0.99] transition-all flex justify-center items-center gap-2 disabled:opacity-50 text-xs sm:text-sm cursor-pointer mt-3"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Criar Minha Conta
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Demo Credentials Quick Switcher */}
        <div className="mt-6 pt-5 border-t border-slate-700/60">
          <p className="text-[11px] font-medium text-slate-400 text-center mb-2.5">
            Acesso Rápido de Demonstração:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillDemo('admin', 'admin123')}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/60 rounded-lg text-slate-200 transition-colors flex items-center gap-1.5 justify-center cursor-pointer text-[11px]"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('carlos', 'user123')}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/60 rounded-lg text-slate-200 transition-colors flex items-center gap-1.5 justify-center cursor-pointer text-[11px]"
            >
              <UserIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Usuário Comum</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowRecovery(false);
                setRecoveryMsg(null);
                setRecoveryError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Recuperar Senha
                </h3>
                <p className="text-xs text-slate-400">
                  Solicite o redefinimento da sua senha
                </p>
              </div>
            </div>

            {recoveryMsg ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs space-y-3">
                <div className="flex items-center gap-2 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" /> Solicitado com sucesso!
                </div>
                <p>{recoveryMsg}</p>
                <button
                  type="button"
                  onClick={() => setShowRecovery(false)}
                  className="w-full mt-2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                {recoveryError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg">
                    {recoveryError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Informe seu e-mail ou nome de usuário
                  </label>
                  <input
                    type="text"
                    value={recoveryUser}
                    onChange={(e) => setRecoveryUser(e.target.value)}
                    placeholder="Ex: carlos ou carlos@quadras.com"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecovery(false)}
                    className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex justify-center items-center cursor-pointer"
                  >
                    {recoveryLoading ? 'Solicitando...' : 'Enviar Solicitação'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
