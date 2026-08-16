import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface UsuariosViewProps {
  currentUser: User;
  darkMode: boolean;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  currentUser,
  darkMode,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [permissao, setPermissao] = useState<UserRole>('Dirigente');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Delete User Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    api
      .getUsers()
      .then((data) => setUsers(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setNome('');
    setUsuario('');
    setEmail('');
    setSenha('');
    setPermissao('Dirigente');
    setError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setNome(u.nome || '');
    setUsuario(u.usuario || '');
    setEmail(u.email || '');
    setSenha('');
    setPermissao(u.permissao);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanNome = nome.trim();
    const cleanUsuario = usuario.trim().replace(/^@/, '');
    const cleanEmail = email.trim();
    const cleanSenha = senha.trim();

    if (!cleanNome) {
      setError('Por favor, informe o nome completo do usuário.');
      return;
    }
    if (!cleanUsuario) {
      setError('Por favor, informe o nome de usuário (login).');
      return;
    }

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          nome: cleanNome,
          usuario: cleanUsuario,
          email: cleanEmail || undefined,
          permissao,
          senha: cleanSenha ? cleanSenha : undefined,
        });
        setSuccess('Usuário atualizado com sucesso.');
      } else {
        if (!cleanSenha) {
          setError('Defina uma senha inicial para o novo usuário.');
          return;
        }
        await api.createUser({
          nome: cleanNome,
          usuario: cleanUsuario,
          email: cleanEmail || undefined,
          permissao,
          senha: cleanSenha,
        });
        setSuccess('Novo usuário cadastrado com sucesso.');
      }

      setTimeout(() => {
        setShowModal(false);
        setSuccess(null);
        loadUsers();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar a operação.');
    }
  };

  const handlePromptDeleteUser = (u: User) => {
    if (u.id === currentUser.id) {
      setDeleteUserError('Você não pode excluir a si mesmo.');
      setUserToDelete(u);
      return;
    }
    setDeleteUserError(null);
    setUserToDelete(u);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser.id) return;

    setDeletingUser(true);
    setDeleteUserError(null);
    try {
      await api.deleteUser(userToDelete.id);
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      setDeleteUserError(err.message || 'Erro ao excluir usuário.');
    } finally {
      setDeletingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`p-6 rounded-2xl border transition-colors shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gerenciamento de Usuários</h2>
              <p className="text-xs text-slate-400">
                Cadastre e edite permissões de acessos dos usuários do sistema
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Usuário
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Carregando lista de usuários...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Permissão</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(users || []).map((u) => {
                  const isAdminRole = u.permissao === 'Administrador';
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold">{u.nome}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        @{u.usuario}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isAdminRole
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {u.permissao}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Editar Usuário"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {u.id !== currentUser.id && (
                            <button
                              onClick={() => handlePromptDeleteUser(u)}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                              title="Excluir Usuário"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome de Usuário (Login)
                </label>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ex: matias ou joao"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  E-mail <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: usuario@email.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {editingUser
                    ? 'Nova Senha (deixe em branco se não quiser alterar)'
                    : 'Senha Inicial'}
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nível de Permissão
                </label>
                <select
                  value={permissao}
                  onChange={(e) => setPermissao(e.target.value as UserRole)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="Dirigente">Dirigente</option>
                  <option value="Usuário comum">Usuário comum</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">Excluir Usuário</h3>
                <p className="text-xs text-slate-400">
                  Esta ação removerá o acesso do usuário
                </p>
              </div>
            </div>

            {deleteUserError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {deleteUserError}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Tem certeza que deseja remover o usuário{' '}
                <strong className="text-white font-extrabold">"{userToDelete.nome}"</strong> ({userToDelete.usuario})?
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserToDelete(null);
                    setDeleteUserError(null);
                  }}
                  disabled={deletingUser}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteUser}
                  disabled={deletingUser || userToDelete.id === currentUser.id}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-red-950/40"
                >
                  {deletingUser ? (
                    'Excluindo...'
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Sim, Excluir Usuário
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
