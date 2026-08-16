import React, { useState, useEffect, useMemo } from 'react';
import { Cartao, Quadra, Cidade, Bairro, User } from '../types';
import { api } from '../services/api';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  Search,
  User as UserIcon,
  UserPlus,
  MapPin,
  Building2,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Layers,
  Sparkles,
  Filter,
  Grid3x3,
} from 'lucide-react';

interface CartoesViewProps {
  currentUser: User;
  darkMode: boolean;
}

export const CartoesView: React.FC<CartoesViewProps> = ({
  currentUser,
  darkMode,
}) => {
  const isAdmin = currentUser.permissao === 'Administrador';

  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [allQuadras, setAllQuadras] = useState<Quadra[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded Cartões state for collapse/expand detail view
  const [expandedCartaoIds, setExpandedCartaoIds] = useState<Record<number, boolean>>({});

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('todos');

  // Modal State for Create / Edit Cartão (General Info & Quadras)
  const [showModal, setShowModal] = useState(false);
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCidadeId, setFormCidadeId] = useState<string>('');
  const [formCidadeNome, setFormCidadeNome] = useState('');
  const [formBairroId, setFormBairroId] = useState<string>('');
  const [formBairroNome, setFormBairroNome] = useState('');
  const [formQuadrasInicio, setFormQuadrasInicio] = useState('');
  const [formQuadrasFim, setFormQuadrasFim] = useState('');
  const [selectedQuadraIds, setSelectedQuadraIds] = useState<(number | string)[]>([]);

  // Add Quadras to existing Cartao Modal State
  const [addingQuadraCartao, setAddingQuadraCartao] = useState<Cartao | null>(null);
  const [addQuadraMode, setAddQuadraMode] = useState<'single' | 'range'>('single');
  const [addQuadraNumero, setAddQuadraNumero] = useState('');
  const [addQuadraInicio, setAddQuadraInicio] = useState('1');
  const [addQuadraFim, setAddQuadraFim] = useState('10');
  const [savingNewQuadras, setSavingNewQuadras] = useState(false);
  const [addQuadraError, setAddQuadraError] = useState<string | null>(null);
  
  // Modal Quadra Picker Filter
  const [pickerCidadeId, setPickerCidadeId] = useState<string>('');
  const [pickerBairroId, setPickerBairroId] = useState<string>('');
  const [pickerSearchNum, setPickerSearchNum] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal State for Dedicated User Assignment Step
  const [assigningCartao, setAssigningCartao] = useState<Cartao | null>(null);
  const [assignModalUserId, setAssignModalUserId] = useState<string>('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignModalError, setAssignModalError] = useState<string | null>(null);

  // Modal State for Delete Confirmation
  const [cartaoToDelete, setCartaoToDelete] = useState<Cartao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toggling quadra inside cartao loading state
  const [togglingQuadraId, setTogglingQuadraId] = useState<number | string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const cartoesPromise = api.getCartoes();
      const cidadesPromise = api.getCidades();
      const bairrosPromise = api.getBairros();
      const usersPromise = isAdmin ? api.getUsers().catch(() => []) : Promise.resolve([]);
      const quadrasPromise = isAdmin ? api.getQuadras().catch(() => []) : Promise.resolve([]);

      const [cList, cidList, bList, uList, qList] = await Promise.all([
        cartoesPromise,
        cidadesPromise,
        bairrosPromise,
        usersPromise,
        quadrasPromise,
      ]);

      setCartoes(cList);
      setCidades(cidList);
      setBairros(bList);
      setUsers(uList);
      setAllQuadras(qList);

      // Auto-expand all cartões on initial load
      const initialExpanded: Record<number, boolean> = {};
      cList.forEach((c) => {
        initialExpanded[c.id] = true;
      });
      setExpandedCartaoIds(initialExpanded);
    } catch (err) {
      console.error('Erro ao carregar cartões:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedCartaoIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const defaultCidadeId = cidades[0] ? String(cidades[0].id) : '';
    const defaultCidadeNome = cidades[0] ? cidades[0].nome : 'Canapi';
    setEditingCartao(null);
    setFormTitulo('');
    setFormDescricao('');
    setFormCidadeId(defaultCidadeId);
    setFormCidadeNome(defaultCidadeNome);
    setFormBairroId('');
    setFormBairroNome('');
    setFormQuadrasInicio('1');
    setFormQuadrasFim('10');
    setSelectedQuadraIds([]);
    setPickerCidadeId(defaultCidadeId);
    setPickerBairroId('');
    setPickerSearchNum('');
    setModalError(null);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (c: Cartao) => {
    const defaultCidadeId = c.cidadeId ? String(c.cidadeId) : (cidades[0] ? String(cidades[0].id) : '');
    setEditingCartao(c);
    setFormTitulo(c.titulo || '');
    setFormDescricao(c.descricao || '');
    setFormCidadeId(defaultCidadeId);
    setFormCidadeNome(c.cidadeNome || (cidades[0] ? cidades[0].nome : ''));
    setFormBairroId(c.bairroId ? String(c.bairroId) : '');
    setFormBairroNome(c.bairroNome || '');
    setFormQuadrasInicio('');
    setFormQuadrasFim('');
    setSelectedQuadraIds(c.quadraIds || []);
    setPickerCidadeId(defaultCidadeId);
    setPickerBairroId(c.bairroId ? String(c.bairroId) : '');
    setPickerSearchNum('');
    setModalError(null);
    setShowModal(true);
  };

  // Open Add Quadras to Cartao Modal
  const handleOpenAddQuadrasModal = (c: Cartao) => {
    setAddingQuadraCartao(c);
    setAddQuadraMode('range');
    setAddQuadraNumero('');
    setAddQuadraInicio('1');
    setAddQuadraFim('10');
    setAddQuadraError(null);
  };

  // Save New Quadras for Cartao
  const handleSaveNewQuadrasForCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingQuadraCartao) return;

    setSavingNewQuadras(true);
    setAddQuadraError(null);

    try {
      if (addQuadraMode === 'single') {
        if (!addQuadraNumero.trim()) {
          setAddQuadraError('Informe o número da quadra (ex: 01).');
          setSavingNewQuadras(false);
          return;
        }
        await api.createQuadrasParaCartao(addingQuadraCartao.id, {
          numero: addQuadraNumero.trim(),
        });
      } else {
        const start = Number(addQuadraInicio);
        const end = Number(addQuadraFim);
        if (isNaN(start) || isNaN(end) || start > end) {
          setAddQuadraError('Insira um intervalo numérico válido (ex: 1 a 10).');
          setSavingNewQuadras(false);
          return;
        }
        await api.createQuadrasParaCartao(addingQuadraCartao.id, {
          inicio: start,
          fim: end,
        });
      }

      setAddingQuadraCartao(null);
      await loadData();
    } catch (err: any) {
      setAddQuadraError(err.message || 'Erro ao criar quadras para este cartão.');
    } finally {
      setSavingNewQuadras(false);
    }
  };

  // Open Dedicated Assignment Modal
  const handleOpenAssignModal = (c: Cartao) => {
    setAssigningCartao(c);
    setAssignModalUserId(c.usuarioId ? String(c.usuarioId) : '');
    setAssignModalError(null);
  };

  // Save Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningCartao) return;

    setSavingAssignment(true);
    setAssignModalError(null);

    try {
      const selectedId = assignModalUserId && assignModalUserId.trim() !== '' ? assignModalUserId : null;
      await api.updateCartao(assigningCartao.id, {
        usuarioId: selectedId,
      });

      setAssigningCartao(null);
      await loadData();
    } catch (err: any) {
      setAssignModalError(err.message || 'Erro ao atribuir usuário ao cartão.');
    } finally {
      setSavingAssignment(false);
    }
  };

  // Handle Save Cartao
  const handleSaveCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      setModalError('Informe o nome do cartão (ex: Cartão 01).');
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      const payload: any = {
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim(),
        cidadeId: formCidadeId || null,
        cidadeNome: formCidadeNome.trim(),
        bairroId: formBairroId || null,
        bairroNome: formBairroNome.trim(),
        quadraIds: selectedQuadraIds,
      };

      if (!editingCartao && formQuadrasInicio && formQuadrasFim) {
        payload.quadrasIniciaisInicio = Number(formQuadrasInicio);
        payload.quadrasIniciaisFim = Number(formQuadrasFim);
      }

      if (editingCartao) {
        await api.updateCartao(editingCartao.id, payload);
      } else {
        await api.createCartao(payload);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(err.message || 'Erro ao salvar o cartão.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Cartao
  const handlePromptDeleteCartao = (c: Cartao) => {
    setCartaoToDelete(c);
    setDeleteError(null);
  };

  const confirmDeleteCartao = async () => {
    if (!cartaoToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCartao(cartaoToDelete.id);
      setCartaoToDelete(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir cartão.');
    } finally {
      setDeleting(false);
    }
  };

  // Handle Toggle Quadra in Cartao
  const handleToggleCartaoQuadra = async (cartaoId: number | string, quadraId: number | string) => {
    setTogglingQuadraId(quadraId);
    try {
      const updatedQuadra = await api.toggleCartaoQuadra(cartaoId, quadraId);

      // Optimistically update local cartões state
      setCartoes((prevCartoes) =>
        prevCartoes.map((c) => {
          if (String(c.id) !== String(cartaoId)) return c;

          const updatedQuadras = (c.quadras || []).map((q) =>
            String(q.id) === String(quadraId) ? { ...q, ...updatedQuadra } : q
          );

          const total = updatedQuadras.length;
          const done = updatedQuadras.filter((q) => q.status === 'Feita').length;

          return {
            ...c,
            quadras: updatedQuadras,
            totalQuadras: total,
            concluidasQuadras: done,
          };
        })
      );
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status da quadra.');
    } finally {
      setTogglingQuadraId(null);
    }
  };

  // Set of quadra IDs that belong to OTHER cartões
  const takenQuadraIds = useMemo(() => {
    const set = new Set<string>();
    cartoes.forEach((c) => {
      if (!editingCartao || String(c.id) !== String(editingCartao.id)) {
        if (Array.isArray(c.quadraIds)) {
          c.quadraIds.forEach((qId) => set.add(String(qId)));
        }
      }
    });
    return set;
  }, [cartoes, editingCartao]);

  // Helper for quadra picker in modal (exclusively available quadras)
  const filteredPickerQuadras = allQuadras.filter((q) => {
    // Exclude quadras that already belong to another cartão
    if (takenQuadraIds.has(String(q.id))) return false;
    if (pickerCidadeId && String(q.cidadeId) !== String(pickerCidadeId)) return false;
    if (pickerBairroId && String(q.bairroId) !== String(pickerBairroId)) return false;
    if (
      pickerSearchNum &&
      !q.numero.toLowerCase().includes(pickerSearchNum.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const toggleSelectQuadraInModal = (id: number | string) => {
    setSelectedQuadraIds((prev) =>
      prev.some((qId) => String(qId) === String(id))
        ? prev.filter((qId) => String(qId) !== String(id))
        : [...prev, id]
    );
  };

  const selectAllFilteredQuadras = () => {
    const idsToAdd = filteredPickerQuadras.map((q) => q.id);
    setSelectedQuadraIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const deselectAllFilteredQuadras = () => {
    const idsToRemove = new Set(filteredPickerQuadras.map((q) => String(q.id)));
    setSelectedQuadraIds((prev) => prev.filter((id) => !idsToRemove.has(String(id))));
  };

  // Filter displayed cartões
  const filteredCartoes = cartoes.filter((c) => {
    if (!isAdmin) {
      // Regular users and Dirigentes ONLY see cartões assigned to them
      const isAssigned =
        (c.usuarioId && String(c.usuarioId) === String(currentUser.id)) ||
        (c.usuarioNome && currentUser.nome && c.usuarioNome.trim().toLowerCase() === currentUser.nome.trim().toLowerCase());
      if (!isAssigned) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesTitle = c.titulo.toLowerCase().includes(term);
      const matchesDesc = (c.descricao || '').toLowerCase().includes(term);
      const matchesUser = (c.usuarioNome || '').toLowerCase().includes(term);
      if (!matchesTitle && !matchesDesc && !matchesUser) return false;
    }
    if (isAdmin && selectedUserFilter !== 'todos') {
      if (selectedUserFilter === 'sem_usuario') {
        if (c.usuarioId !== null && c.usuarioId !== undefined && String(c.usuarioId).trim() !== '') return false;
      } else {
        if (String(c.usuarioId) !== String(selectedUserFilter)) return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-semibold">Carregando cartões...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div
        className={`p-5 rounded-2xl border ${
          darkMode
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        } flex flex-col md:flex-row md:items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xl shadow-sm">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {isAdmin ? 'Gestão de Cartões' : 'Cartões Designados'}
            </h1>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Gerencie cartões, vincule quadras e atribua responsáveis'
                : 'Acompanhe seus cartões designados e marque as quadras concluídas'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-900/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Cartão</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título do cartão, descrição ou usuário..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border outline-none transition-all ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-emerald-500'
                : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500 shadow-sm'
            }`}
          />
        </div>

        {isAdmin && (
          <div className="relative">
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none transition-all appearance-none cursor-pointer ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-emerald-500'
                  : 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500 shadow-sm'
              }`}
            >
              <option value="todos">Todos os Usuários</option>
              <option value="sem_usuario">Sem Usuário Atribuído</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.permissao})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Cartões List Grid */}
      {filteredCartoes.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border ${
            darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-300 mb-1">
            Nenhum cartão encontrado
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {isAdmin
              ? 'Nenhum cartão atende aos filtros atuais ou nenhum foi criado ainda.'
              : 'Você ainda não possui cartões atribuídos. Entre em contato com o administrador.'}
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-500"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeiro Cartão</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredCartoes.map((cartao) => {
            const isExpanded = !!expandedCartaoIds[cartao.id];
            const total = cartao.totalQuadras || 0;
            const concluidas = cartao.concluidasQuadras || 0;
            const percent = total > 0 ? Math.round((concluidas / total) * 100) : 0;

            return (
              <div
                key={cartao.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  darkMode
                    ? 'bg-slate-900/90 border-slate-800/80 shadow-lg'
                    : 'bg-white border-slate-200 shadow-md'
                }`}
              >
                {/* Cartão Header Bar */}
                <div className="p-5 border-b border-slate-200/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {cartao.titulo}
                      </span>

                      {cartao.cidadeNome && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800 text-slate-300">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {cartao.cidadeNome}
                        </span>
                      )}

                      {cartao.bairroNome && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800 text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {cartao.bairroNome}
                        </span>
                      )}

                      <button
                        disabled={!isAdmin}
                        onClick={() => isAdmin && handleOpenAssignModal(cartao)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                          cartao.usuarioId
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        } ${isAdmin ? 'hover:border-indigo-400 cursor-pointer' : ''}`}
                        title={isAdmin ? 'Clique para designar um usuário' : ''}
                      >
                        <UserIcon className="w-3 h-3" />
                        <span>{cartao.usuarioNome || 'Não atribuído'}</span>
                        {isAdmin && <UserPlus className="w-2.5 h-2.5 ml-0.5 text-indigo-400" />}
                      </button>
                    </div>

                    {cartao.descricao && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {cartao.descricao}
                      </p>
                    )}
                  </div>

                  {/* Actions & Expand Toggle */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 border-r border-slate-700/50 pr-3">
                        <button
                          onClick={() => handleOpenAddQuadrasModal(cartao)}
                          title="Criar e Vincular Quadras a este Cartão"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Criar Quadras</span>
                        </button>
                        <button
                          onClick={() => handleOpenAssignModal(cartao)}
                          title="Designar Usuário"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Designar</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(cartao)}
                          title="Editar Cartão"
                          className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePromptDeleteCartao(cartao)}
                          title="Excluir Cartão"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleExpand(cartao.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        darkMode
                          ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{isExpanded ? 'Ocultar Quadras' : 'Ver Quadras'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar Header */}
                <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          percent === 100
                            ? 'bg-emerald-500'
                            : percent > 50
                            ? 'bg-emerald-400'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold shrink-0">{percent}%</span>
                  </div>

                  <div className="text-xs text-slate-400 font-medium flex items-center gap-3 shrink-0">
                    <span>
                      <strong className="text-emerald-500">{concluidas}</strong> de{' '}
                      <strong>{total}</strong> quadras concluídas
                    </span>
                    {percent === 100 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Concluído
                      </span>
                    )}
                  </div>
                </div>

                {/* Quadras Content List */}
                {isExpanded && (
                  <div className="p-5">
                    {!cartao.quadras || cartao.quadras.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">
                        Nenhuma quadra vinculada a este cartão.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {cartao.quadras.map((quadra) => {
                          const isDone = quadra.status === 'Feita';
                          const isToggling = togglingQuadraId === quadra.id;

                          return (
                            <div
                              key={quadra.id}
                              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                                isDone
                                  ? darkMode
                                    ? 'bg-emerald-950/20 border-emerald-500/30'
                                    : 'bg-emerald-50 border-emerald-200'
                                  : darkMode
                                  ? 'bg-slate-800/40 border-slate-700/60'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm">
                                    Quadra {quadra.numero}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isDone
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-700/50 text-slate-400'
                                    }`}
                                  >
                                    {isDone ? 'Feita' : 'Não feita'}
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-400">
                                  {quadra.bairroNome} - {quadra.cidadeNome}
                                </p>

                                {isDone && quadra.usuarioNome && (
                                  <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium pt-1">
                                    Concluída por: {quadra.usuarioNome}
                                  </p>
                                )}
                              </div>

                              {/* Toggle Checkbox Button */}
                              <button
                                disabled={isToggling}
                                onClick={() =>
                                  handleToggleCartaoQuadra(cartao.id, quadra.id)
                                }
                                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  isDone
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                    : darkMode
                                    ? 'bg-slate-700 text-slate-200 hover:bg-emerald-600 hover:text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white'
                                }`}
                              >
                                {isToggling ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : isDone ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Concluída (Clique para alterar)</span>
                                  </>
                                ) : (
                                  <>
                                    <Circle className="w-4 h-4 opacity-60" />
                                    <span>Marcar como Feita</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CARTÃO MODAL (Admin Only) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingCartao ? 'Editar Cartão' : 'Novo Cartão de Quadras'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina o título, a cidade principal e selecione as quadras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCartao} className="p-5 space-y-5">
              {modalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Form Info Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nome do cartão <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ex: Cartão 01"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Descrição do cartão (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    placeholder="Ex: Visitas nas quadras do setor comercial..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Cidade principal (Preenchimento Automático)
                  </label>
                  <input
                    type="text"
                    value={formCidadeNome || (cidades[0] ? cidades[0].nome : 'Canapi')}
                    onChange={(e) => setFormCidadeNome(e.target.value)}
                    placeholder="Ex: Canapi"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Bairro (Campo de preenchimento)
                  </label>
                  <input
                    type="text"
                    value={formBairroNome}
                    onChange={(e) => setFormBairroNome(e.target.value)}
                    placeholder="Ex: Centro, Alto do Cruzeiro"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>

                {!editingCartao && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-800/80 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Gerar Quadras Iniciais para este Cartão (Opcional)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">Quadra Inicial</span>
                        <input
                          type="number"
                          min="1"
                          value={formQuadrasInicio}
                          onChange={(e) => setFormQuadrasInicio(e.target.value)}
                          placeholder="Ex: 1"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                            darkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                          }`}
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">Quadra Final</span>
                        <input
                          type="number"
                          min="1"
                          value={formQuadrasFim}
                          onChange={(e) => setFormQuadrasFim(e.target.value)}
                          placeholder="Ex: 10"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                            darkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-200/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{editingCartao ? 'Salvar Alterações' : 'Criar Cartão'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CARTÃO CONFIRMATION MODAL */}
      {cartaoToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base">Excluir Cartão?</h3>
            </div>

            <p className="text-xs text-slate-400">
              Tem certeza que deseja excluir o cartão{' '}
              <strong className="text-white">"{cartaoToDelete.titulo}"</strong>? Esta
              ação excluirá o cartão e removerá suas respectivas quadras vinculadas.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCartaoToDelete(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteCartao}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-500 flex items-center gap-2"
              >
                {deleting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Excluir Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESIGNAR USUÁRIO MODAL (Admin Only) */}
      {assigningCartao && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Designar Usuário</h3>
                  <p className="text-xs text-slate-400">
                    Cartão: <strong className="text-emerald-400">{assigningCartao.titulo}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningCartao(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              {assignModalError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{assignModalError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Selecione o Usuário Responsável
                </label>
                <select
                  value={assignModalUserId}
                  onChange={(e) => setAssignModalUserId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                >
                  <option value="">Nenhum (Não atribuído)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.permissao})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 pt-1">
                  O usuário selecionado visualizará este cartão e suas quadras no painel dele.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/10">
                <button
                  type="button"
                  onClick={() => setAssigningCartao(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAssignment}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-900/20 disabled:opacity-50"
                >
                  {savingAssignment && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Atribuir Usuário</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal for Creating Quadras specifically for a Cartão */}
      {addingQuadraCartao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Grid3x3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Criar Quadras para o Cartão</h3>
                  <p className="text-[11px] text-slate-400">
                    Cartão: <strong className="text-emerald-400">{addingQuadraCartao.titulo}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddingQuadraCartao(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewQuadrasForCartao} className="space-y-4">
              {addQuadraError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addQuadraError}</span>
                </div>
              )}

              {/* Selection Mode: Range or Single */}
              <div className="flex items-center gap-2 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setAddQuadraMode('range')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    addQuadraMode === 'range'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Intervalo (ex: 1 a 10)
                </button>
                <button
                  type="button"
                  onClick={() => setAddQuadraMode('single')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    addQuadraMode === 'single'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Quadra Única (ex: 01)
                </button>
              </div>

              {addQuadraMode === 'range' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Quadra Inicial
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={addQuadraInicio}
                      onChange={(e) => setAddQuadraInicio(e.target.value)}
                      placeholder="Ex: 1"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Quadra Final
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={addQuadraFim}
                      onChange={(e) => setAddQuadraFim(e.target.value)}
                      placeholder="Ex: 10"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Número da Quadra
                  </label>
                  <input
                    type="text"
                    required
                    value={addQuadraNumero}
                    onChange={(e) => setAddQuadraNumero(e.target.value)}
                    placeholder="Ex: 01, 02A, 15"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                    }`}
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                As quadras criadas utilizarão automaticamente a cidade e o bairro associados a este cartão.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/10">
                <button
                  type="button"
                  onClick={() => setAddingQuadraCartao(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNewQuadras}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50"
                >
                  {savingNewQuadras && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Criar e Vincular</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
