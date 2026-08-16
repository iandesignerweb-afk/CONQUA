import React, { useState, useEffect } from 'react';
import { Cidade, Bairro, Quadra, User } from '../types';
import { api } from '../services/api';
import { QuadraDetailModal } from './QuadraDetailModal';
import { CartoesView } from './CartoesView';
import {
  Grid3x3,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  Filter,
  MapPin,
  User as UserIcon,
  AlertTriangle,
  Info,
  PlusCircle,
  X,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';

interface QuadrasControlViewProps {
  currentUser: User;
  darkMode: boolean;
  globalSearch: string;
}

export const QuadrasControlView: React.FC<QuadrasControlViewProps> = ({
  currentUser,
  darkMode,
  globalSearch,
}) => {
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [quadras, setQuadras] = useState<Quadra[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Filter States
  const [selectedCidade, setSelectedCidade] = useState<string>('');
  const [selectedBairro, setSelectedBairro] = useState<string>('');
  const [bairroSearchFilter, setBairroSearchFilter] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedUsuario, setSelectedUsuario] = useState<string>('');
  const [searchNumero, setSearchNumero] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [detailQuadra, setDetailQuadra] = useState<Quadra | null>(null);

  // Reset Bairro Modal State
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // New Quadra Modal State
  const [showAddQuadraModal, setShowAddQuadraModal] = useState<boolean>(false);
  const [addQuadraBairroId, setAddQuadraBairroId] = useState<string>('');
  const [quadraMode, setQuadraMode] = useState<'unica' | 'lote'>('unica');
  const [singleNumero, setSingleNumero] = useState<string>('');
  const [bulkInicio, setBulkInicio] = useState<string>('1');
  const [bulkFim, setBulkFim] = useState<string>('30');
  const [addQuadraMsg, setAddQuadraMsg] = useState<string | null>(null);
  const [addQuadraError, setAddQuadraError] = useState<string | null>(null);
  const [savingQuadra, setSavingQuadra] = useState<boolean>(false);

  const isAdmin = currentUser.permissao === 'Administrador';
  const primaryCidade = cidades.length > 0 ? cidades[0] : null;

  // Initial Data Fetch (Cidades, Bairros, Users, Quadras)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const usersPromise = isAdmin
      ? api.getUsers().catch(() => [])
      : Promise.resolve([]);

    Promise.all([
      api.getCidades().catch((err) => {
        console.error('Erro ao carregar cidades:', err);
        return [] as Cidade[];
      }),
      api.getBairros().catch((err) => {
        console.error('Erro ao carregar bairros:', err);
        return [] as Bairro[];
      }),
      usersPromise,
      api.getQuadras({ search: globalSearch }).catch((err) => {
        console.error('Erro ao carregar quadras:', err);
        return [] as Quadra[];
      }),
    ])
      .then(([cids, bList, usrs, qList]) => {
        if (!isMounted) return;
        setCidades(cids);
        setBairros(bList);
        setUsersList(usrs);
        setQuadras(qList);

        if (cids.length > 0) {
          // Do not lock to first city so user sees all cities & bairros by default
          setSelectedCidade('');
        }

        if (bList.length > 0) {
          setSelectedBairro('');
          setAddQuadraBairroId(String(bList[0].id));
        }

        setInitialDataLoaded(true);
      })
      .catch((err) => {
        console.error('Erro ao carregar dados iniciais:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Quadras when filters change (after initial load)
  const fetchQuadras = () => {
    if (!initialDataLoaded) return;
    setLoading(true);
    api
      .getQuadras({
        cidadeId: selectedCidade || undefined,
        bairroId: selectedBairro || undefined,
        status: selectedStatus,
        usuarioId: selectedUsuario,
        numero: searchNumero,
        search: globalSearch,
      })
      .then((data) => {
        setQuadras(data);
      })
      .catch((err) => {
        console.error('Erro ao carregar quadras:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQuadras();
  }, [
    selectedCidade,
    selectedBairro,
    selectedStatus,
    selectedUsuario,
    searchNumero,
    globalSearch,
    initialDataLoaded,
  ]);

  // Toggle Quadra status
  const handleQuadraClick = async (q: Quadra) => {
    if (q.status === 'Feita') {
      setDetailQuadra(q);
      return;
    }

    setTogglingId(q.id);
    try {
      const updated = await api.toggleQuadra(q.id);
      setQuadras((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err: any) {
      alert(err.message || 'Não foi possível alterar o status da quadra.');
    } finally {
      setTogglingId(null);
    }
  };

  // Reset Bairro handler
  const handleConfirmReset = async () => {
    if (!selectedBairro) return;
    setResetting(true);
    try {
      const res = await api.resetBairro(selectedBairro);
      setResetSuccessMessage(res.message);
      fetchQuadras();
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Falha ao resetar bairro.');
    } finally {
      setResetting(false);
    }
  };

  // Open Add Quadra Modal
  const handleOpenAddQuadra = () => {
    setAddQuadraBairroId(selectedBairro || (bairros[0] ? String(bairros[0].id) : ''));
    setQuadraMode('unica');
    setSingleNumero('');
    setBulkInicio('1');
    setBulkFim('30');
    setAddQuadraMsg(null);
    setAddQuadraError(null);
    setShowAddQuadraModal(true);
  };

  // Submit new Quadra
  const handleSaveQuadra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQuadraBairroId || !primaryCidade) {
      setAddQuadraError('Selecione um bairro válido.');
      return;
    }

    setSavingQuadra(true);
    setAddQuadraMsg(null);
    setAddQuadraError(null);

    try {
      if (quadraMode === 'unica') {
        if (!singleNumero.trim()) {
          setAddQuadraError('Informe o número da quadra.');
          setSavingQuadra(false);
          return;
        }
        await api.createQuadra(
          primaryCidade.id,
          addQuadraBairroId,
          singleNumero.trim()
        );
        setAddQuadraMsg(`Quadra ${singleNumero} adicionada com sucesso!`);
      } else {
        const start = Number(bulkInicio);
        const end = Number(bulkFim);
        if (isNaN(start) || isNaN(end) || start > end) {
          setAddQuadraError('Informe um intervalo numérico válido.');
          setSavingQuadra(false);
          return;
        }
        const res = await api.createQuadrasBulk(
          primaryCidade.id,
          addQuadraBairroId,
          start,
          end
        );
        setAddQuadraMsg(res.message);
      }

      fetchQuadras();
      setTimeout(() => {
        setShowAddQuadraModal(false);
        setAddQuadraMsg(null);
      }, 1200);
    } catch (err: any) {
      setAddQuadraError(err.message || 'Erro ao cadastrar quadra(s).');
    } finally {
      setSavingQuadra(false);
    }
  };

  // Filter bairros for Bairros list view
  const filteredBairros = bairros.filter((b) => {
    const matchesCidade = selectedCidade ? String(b.cidadeId) === selectedCidade : true;
    const matchesSearch = b.nome.toLowerCase().includes(bairroSearchFilter.toLowerCase());
    return matchesCidade && matchesSearch;
  });

  // Progress metrics - calculate strictly for quadras belonging to active filtered bairros
  const validBairroIds = new Set(
    (selectedBairro
      ? bairros.filter((b) => String(b.id) === selectedBairro)
      : filteredBairros
    ).map((b) => String(b.id))
  );

  const relevantQuadras = quadras.filter((q) =>
    validBairroIds.has(String(q.bairroId || q.bairro_id))
  );

  const totalInView = relevantQuadras.length;
  const doneInView = relevantQuadras.filter((q) => q.status === 'Feita').length;
  const pendingInView = totalInView - doneInView;
  const percentInView =
    totalInView > 0 ? Math.round((doneInView / totalInView) * 100) : 0;

  const currentCidadeObj = cidades.find((c) => String(c.id) === selectedCidade);
  const currentBairroObj = bairros.find((b) => String(b.id) === selectedBairro);

  // For Dirigentes and non-admin users, show exclusively their designated territory cards
  if (!isAdmin) {
    return (
      <CartoesView
        currentUser={currentUser}
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------------- */}
      {/* CASE 1: NO BAIRRO SELECTED -> SHOW BAIRROS CARDS FIRST         */}
      {/* --------------------------------------------------------------- */}
      {!selectedBairro ? (
        <div className="space-y-6">
          {/* City Overall Progress Banner */}
          <div
            className={`p-5 rounded-2xl border transition-colors shadow-sm ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {currentCidadeObj ? currentCidadeObj.nome : 'Todos os Municípios'} — Progresso Geral
                </span>
                <h3 className="text-base font-extrabold mt-0.5">
                  {doneInView} de {totalInView} quadras concluídas
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-emerald-500">
                  {percentInView}%
                </span>
                <div className="text-right text-[11px] text-slate-400">
                  <p>
                    Concluídas: <strong className="text-emerald-500">{doneInView}</strong>
                  </p>
                  <p>
                    Pendentes: <strong className="text-slate-400">{pendingInView}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-sm shadow-emerald-500/50"
                style={{ width: `${percentInView}%` }}
              />
            </div>
          </div>

          {/* GRID OF BAIRRO CARDS */}
          {loading ? (
            <div className="py-20 text-center text-sm text-slate-400 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Carregando bairros e quadras...
            </div>
          ) : filteredBairros.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400 space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800">
              <Info className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="font-semibold text-slate-300">
                Nenhum bairro encontrado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBairros.map((b) => {
                const bQuadras = quadras.filter((q) => q.bairroId === b.id);
                const bTotal = bQuadras.length;
                const bDone = bQuadras.filter((q) => q.status === 'Feita').length;
                const bPending = bTotal - bDone;
                const bPct = bTotal > 0 ? Math.round((bDone / bTotal) * 100) : 0;

                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBairro(String(b.id))}
                    className={`group relative p-5 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-1 active:scale-98 cursor-pointer flex flex-col justify-between shadow-sm ${
                      darkMode
                        ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:shadow-emerald-950/20'
                        : 'bg-white border-slate-200 hover:border-emerald-500/50 hover:shadow-lg'
                    }`}
                  >
                    <div>
                      {/* Top Info */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            {b.cidadeNome && (
                              <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-1">
                                {b.cidadeNome}
                              </span>
                            )}
                            <h3 className="text-base font-extrabold group-hover:text-emerald-400 transition-colors">
                              {b.nome}
                            </h3>
                            <span className="text-[11px] text-slate-400">
                              {bTotal} {bTotal === 1 ? 'quadra cadastrada' : 'quadras cadastradas'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                            bPct === 100
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                              : 'bg-slate-800 border border-slate-700 text-slate-300'
                          }`}
                        >
                          {bPct}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700/60 my-2">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${bPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
                        <span>
                          Concluídas: <strong className="text-emerald-500">{bDone}</strong>
                        </span>
                        <span>
                          Pendentes: <strong className="text-slate-400">{bPending}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/10 flex items-center justify-between text-xs font-bold text-emerald-500 group-hover:text-emerald-400">
                      <span>Acessar Quadras</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* --------------------------------------------------------------- */
        /* CASE 2: BAIRRO IS SELECTED -> SHOW QUADRAS GRID FOR THAT BAIRRO */
        /* --------------------------------------------------------------- */
        <div className="space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              onClick={() => setSelectedBairro('')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer border border-slate-700 hover:border-slate-600"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              Voltar para Lista de Bairros
            </button>
          </div>

          {/* Top Filter & Control Panel */}
          <div
            className={`p-5 rounded-2xl border transition-colors shadow-sm ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5 pb-5 border-b border-slate-200/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                  <Grid3x3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    Grade de Quadras
                  </h2>
                  <p className="text-xs text-slate-400">
                    Acompanhe e marque o andamento das quadras
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
                {/* Add Quadra Button */}
                {isAdmin && (
                  <button
                    onClick={handleOpenAddQuadra}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Cadastrar Quadra
                  </button>
                )}

                {/* Admin Reset Bairro Button */}
                {isAdmin && selectedBairro && (
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Resetar Bairro
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Cidade Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" /> Cidade
                </label>
                <select
                  value={selectedCidade}
                  onChange={(e) => {
                    setSelectedCidade(e.target.value);
                    setSelectedBairro('');
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                >
                  <option value="">Todas as Cidades</option>
                  {cidades.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-500" /> Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                >
                  <option value="Todos">Todos os Status</option>
                  <option value="Não feita">Cinza (Não feita)</option>
                  <option value="Feita">Verde (Feita)</option>
                </select>
              </div>

              {/* Responsável Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-500" /> Responsável
                </label>
                <select
                  value={selectedUsuario}
                  onChange={(e) => setSelectedUsuario(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                >
                  <option value="">Todos os Usuários</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Number Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Search className="w-3.5 h-3.5 text-emerald-500" /> Nº da Quadra
                </label>
                <input
                  type="text"
                  value={searchNumero}
                  onChange={(e) => setSearchNumero(e.target.value)}
                  placeholder="Ex: 01"
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                />
              </div>
            </div>
          </div>

          {/* Progress Bar & Status Header */}
          <div
            className={`p-5 rounded-2xl border transition-colors shadow-sm ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {primaryCidade ? primaryCidade.nome : 'Município'}
                  {currentBairroObj ? ` › Bairro: ${currentBairroObj.nome}` : ''}
                </span>
                <h3 className="text-base font-extrabold mt-0.5">
                  {doneInView} de {totalInView} quadras concluídas
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-emerald-500">
                  {percentInView}%
                </span>
                <div className="text-right text-[11px] text-slate-400">
                  <p>
                    Concluídas: <strong className="text-emerald-500">{doneInView}</strong>
                  </p>
                  <p>
                    Pendentes: <strong className="text-slate-400">{pendingInView}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-sm shadow-emerald-500/50"
                style={{ width: `${percentInView}%` }}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-200/10 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-slate-500/30 border border-slate-500/50" />
                <span className="text-slate-400 font-medium">Cinza = Não feita</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-400" />
                <span className="text-slate-400 font-medium">Verde = Feita</span>
              </div>
              <div className="ml-auto text-[11px] text-slate-400 hidden md:block">
                * Clique num card cinza para marcar como feita. Clique num card verde para detalhes.
              </div>
            </div>
          </div>

          {/* QUADRA CARDS GRID */}
          <div
            className={`p-6 rounded-2xl border transition-colors shadow-sm ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {loading ? (
              <div className="py-20 text-center text-sm text-slate-400 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Carregando quadras...
              </div>
            ) : quadras.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400 space-y-3">
                <Info className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="font-semibold text-slate-300">
                  Nenhuma quadra encontrada para este bairro ou filtros selecionados.
                </p>
                {isAdmin && (
                  <button
                    onClick={handleOpenAddQuadra}
                    className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Cadastrar Quadra
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3.5">
                {quadras.map((q) => {
                  const isFeita = q.status === 'Feita';
                  const isToggling = togglingId === q.id;

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleQuadraClick(q)}
                      disabled={isToggling}
                      className={`group relative p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-95 cursor-pointer flex flex-col justify-between h-28 overflow-hidden shadow-sm ${
                        isFeita
                          ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-emerald-950/30'
                          : 'bg-slate-200/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xl font-black tracking-tight leading-none">
                          {q.numero}
                        </span>
                        {isFeita ? (
                          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 dark:border-slate-500" />
                        )}
                      </div>

                      <div className="mt-auto pt-2">
                        {isFeita ? (
                          <div>
                            <p className="text-[10px] font-bold text-emerald-100 truncate flex items-center gap-1">
                              <UserIcon className="w-3 h-3 shrink-0" />
                              {q.usuarioNome || 'Concluído'}
                            </p>
                            <p className="text-[9px] text-emerald-200/80 truncate mt-0.5">
                              {q.concluidaEm
                                ? new Date(q.concluidaEm).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                            Não feita
                          </span>
                        )}
                      </div>

                      {isToggling && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Back Button */}
          <div className="pt-2 flex justify-start">
            <button
              onClick={() => setSelectedBairro('')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              Voltar para Lista de Bairros
            </button>
          </div>
        </div>
      )}

      {/* Quadra Detail Modal */}
      {detailQuadra && (
        <QuadraDetailModal
          quadra={detailQuadra}
          onClose={() => setDetailQuadra(null)}
          darkMode={darkMode}
        />
      )}

      {/* Add Quadra Modal */}
      {showAddQuadraModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold">Cadastrar Quadra(s)</h3>
              <button
                onClick={() => setShowAddQuadraModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addQuadraMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {addQuadraMsg}
              </div>
            )}

            {addQuadraError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {addQuadraError}
              </div>
            )}

            <form onSubmit={handleSaveQuadra} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Selecione o Bairro
                </label>
                <select
                  value={addQuadraBairroId}
                  onChange={(e) => setAddQuadraBairroId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  required
                >
                  {bairros.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle Quadra Mode */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setQuadraMode('unica')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    quadraMode === 'unica'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Quadra Única
                </button>
                <button
                  type="button"
                  onClick={() => setQuadraMode('lote')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    quadraMode === 'lote'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Gerar em Lote (Sequência)
                </button>
              </div>

              {quadraMode === 'unica' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Número da Quadra
                  </label>
                  <input
                    type="text"
                    value={singleNumero}
                    onChange={(e) => setSingleNumero(e.target.value)}
                    placeholder="Ex: 59, 60, 12..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nº Inicial
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bulkInicio}
                      onChange={(e) => setBulkInicio(e.target.value)}
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
                      Nº Final
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={bulkFim}
                      onChange={(e) => setBulkFim(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuadraModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingQuadra}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer flex justify-center items-center"
                >
                  {savingQuadra ? 'Cadastrando...' : 'Salvar Quadra(s)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl relative ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Resetar Bairro</h3>
                <p className="text-xs text-slate-400">
                  Atenção: esta ação reiniciará o ciclo do bairro
                </p>
              </div>
            </div>

            {resetSuccessMessage ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
                {resetSuccessMessage}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tem certeza que deseja resetar todas as quadras do bairro{' '}
                  <strong className="text-white font-bold">
                    {currentBairroObj?.nome}
                  </strong>
                  ?
                </p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] space-y-1">
                  <p>✔ Todas as quadras voltarão para <strong>"Não feita"</strong>.</p>
                  <p>✔ Os responsáveis e datas de conclusão serão limpos.</p>
                  <p>✔ Um novo ciclo de visitas será iniciado com registro no histórico.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmReset}
                    disabled={resetting}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all flex justify-center items-center gap-2 cursor-pointer"
                  >
                    {resetting ? (
                      'Resetando...'
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Confirmar Reset
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
