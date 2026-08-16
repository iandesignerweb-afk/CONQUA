import React, { useEffect, useState } from 'react';
import { User, Cartao, CartaoDesignacao } from '../types';
import { api } from '../services/api';
import {
  Printer,
  FileText,
  Calendar,
  Filter,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Save,
  Building2,
  RefreshCw,
} from 'lucide-react';

interface RegistroTerritoriosViewProps {
  currentUser: User;
  darkMode: boolean;
}

export const RegistroTerritoriosView: React.FC<RegistroTerritoriosViewProps> = ({
  currentUser,
  darkMode,
}) => {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Document configuration state
  const [anoServico, setAnoServico] = useState<string>('2026');
  const [numCiclos, setNumCiclos] = useState<number>(3); // Number of repeating cycle columns (default 3)
  const [cidadeFiltro, setCidadeFiltro] = useState<string>('');
  const [busca, setBusca] = useState<string>('');

  // Editing cycle modal
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null);
  const [editDesignacoes, setEditDesignacoes] = useState<CartaoDesignacao[]>([]);
  const [editUltimaData, setEditUltimaData] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // New Cycle form in modal
  const [novoDirigente, setNovoDirigente] = useState<string>('');
  const [novaDataDesignacao, setNovaDataDesignacao] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [novaDataConclusao, setNovaDataConclusao] = useState<string>('');

  const [dirigentes, setDirigentes] = useState<User[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cartoesRes, usersRes] = await Promise.all([
        api.getCartoes(),
        api.getUsers().catch(() => []),
      ]);
      setCartoes(cartoesRes);
      setDirigentes(usersRes);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered Cartoes
  const cartoesFiltrados = cartoes.filter((c) => {
    if (cidadeFiltro && c.cidadeId && String(c.cidadeId) !== cidadeFiltro) return false;
    if (busca) {
      const term = busca.toLowerCase();
      const matchTitulo = c.titulo.toLowerCase().includes(term);
      const matchCidade = c.cidadeNome?.toLowerCase().includes(term);
      const matchDirigente = c.usuarioNome?.toLowerCase().includes(term);
      return matchTitulo || matchCidade || matchDirigente;
    }
    return true;
  });

  // Extract cities for filter dropdowns
  const cidadesMap = new Map<number | string, { id: number | string; nome: string }>();
  cartoes.forEach((c) => {
    if (c.cidadeId && c.cidadeNome) {
      cidadesMap.set(c.cidadeId, { id: c.cidadeId, nome: c.cidadeNome });
    }
  });
  const cidadesDisponiveis = Array.from(cidadesMap.values());

  // Open Edit Modal for a Cartão
  const handleOpenEditModal = (c: Cartao) => {
    setEditingCartao(c);
    setEditDesignacoes(c.designacoes ? [...c.designacoes] : []);
    setEditUltimaData(c.ultimaDataConcluida || '');
    setNovoDirigente(c.usuarioNome && c.usuarioNome !== 'Não atribuído' ? c.usuarioNome : '');
    setNovaDataDesignacao(new Date().toISOString().split('T')[0]);
    setNovaDataConclusao('');
  };

  const handleAddCycleInModal = () => {
    if (!novoDirigente.trim()) return;

    let formattedDesignacaoDate = novaDataDesignacao;
    if (novaDataDesignacao.includes('-')) {
      const [y, m, d] = novaDataDesignacao.split('-');
      formattedDesignacaoDate = `${d}/${m}/${y}`;
    }

    let formattedConclusaoDate = novaDataConclusao;
    if (novaDataConclusao && novaDataConclusao.includes('-')) {
      const [y, m, d] = novaDataConclusao.split('-');
      formattedConclusaoDate = `${d}/${m}/${y}`;
    }

    const newCycle: CartaoDesignacao = {
      id: Date.now(),
      dirigenteNome: novoDirigente.trim(),
      dataDesignacao: formattedDesignacaoDate,
      dataConclusao: formattedConclusaoDate || null,
    };

    setEditDesignacoes([...editDesignacoes, newCycle]);
    setNovoDirigente('');
    setNovaDataDesignacao(new Date().toISOString().split('T')[0]);
    setNovaDataConclusao('');
  };

  const handleRemoveCycleInModal = (index: number) => {
    setEditDesignacoes(editDesignacoes.filter((_, i) => i !== index));
  };

  const handleSaveModal = async () => {
    if (!editingCartao) return;
    setSavingEdit(true);
    try {
      await api.updateCartaoDesignacoes(editingCartao.id, {
        designacoes: editDesignacoes,
        ultimaDataConcluida: editUltimaData.trim() || null,
      });

      // Update local state
      setCartoes((prev) =>
        prev.map((c) =>
          c.id === editingCartao.id
            ? {
                ...c,
                designacoes: editDesignacoes,
                ultimaDataConcluida: editUltimaData.trim() || null,
              }
            : c
        )
      );

      setEditingCartao(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações das designações.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Carregando Registro de Designação de Territórios...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SCREEN ONLY CONTROLS HEADER */}
      <div
        className={`p-5 rounded-2xl border transition-colors shadow-sm no-print space-y-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  Registro de Designação de Território
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  Formulário S-13
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Documento oficial de controle anual e histórico de designações por território
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer flex items-center gap-2"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Baixar em PDF
            </button>
          </div>
        </div>

        {/* DOCUMENT CONFIGURATION & FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Service Year Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Ano de Serviço
            </label>
            <input
              type="text"
              value={anoServico}
              onChange={(e) => setAnoServico(e.target.value)}
              placeholder="Ex: 2026"
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
          </div>

          {/* Number of repeating columns */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-emerald-500" /> Ciclos por Linha
            </label>
            <select
              value={numCiclos}
              onChange={(e) => setNumCiclos(Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            >
              <option value={2}>2 Blocos de Designação</option>
              <option value={3}>3 Blocos de Designação (Padrão)</option>
              <option value={4}>4 Blocos de Designação</option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" /> Cidade
            </label>
            <select
              value={cidadeFiltro}
              onChange={(e) => setCidadeFiltro(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            >
              <option value="">Todas as Cidades</option>
              {cidadesDisponiveis.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              Buscar Território
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: Cartão 01, Centro..."
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
          </div>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL DOCUMENT CONTAINER */}
      <div className="bg-white text-slate-950 p-6 md:p-8 rounded-2xl border border-slate-300 shadow-xl print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none">
        {/* DOCUMENT HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-950 pb-4 mb-4 gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase font-serif">
              REGISTRO DE DESIGNAÇÃO DE TERRITÓRIO
            </h1>
            <p className="text-xs text-slate-700 font-semibold mt-0.5">
              Controle Geral de Territórios e Histórico de Designações
            </p>
          </div>

          <div className="text-right flex items-center gap-2 border-2 border-slate-950 px-3 py-1.5 rounded bg-slate-50">
            <span className="text-xs font-bold uppercase text-slate-950">
              Ano de Serviço:
            </span>
            <span className="text-sm font-black text-slate-950 underline decoration-2 font-mono">
              {anoServico || '_____'}
            </span>
          </div>
        </div>

        {/* DOCUMENT TABLE */}
        {cartoesFiltrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500 italic border border-dashed border-slate-300 rounded-xl">
            Nenhum cartão / território encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans border-2 border-slate-950">
              <thead>
                {/* TOP HEADER ROW WITH GROUPED COLUMNS */}
                <tr className="border-b-2 border-slate-950 bg-slate-100 text-slate-950 font-black uppercase text-[11px]">
                  <th
                    rowSpan={2}
                    className="py-2 px-2.5 border-r-2 border-slate-950 align-bottom w-28 text-center"
                  >
                    Terr. n.º
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2 px-2.5 border-r-2 border-slate-950 align-bottom w-28 text-center"
                  >
                    Última data concluída
                  </th>

                  {/* REPEATING DESIGNATION CYCLES HEADERS */}
                  {Array.from({ length: numCiclos }).map((_, idx) => (
                    <th
                      key={idx}
                      colSpan={3}
                      className={`py-1 px-2 text-center uppercase tracking-wider ${
                        idx < numCiclos - 1 ? 'border-r-2 border-slate-950' : ''
                      }`}
                    >
                      {idx === 0 ? '1ª Designação' : idx === 1 ? '2ª Designação' : `${idx + 1}ª Designação`}
                    </th>
                  ))}
                </tr>

                {/* SUB-HEADER ROW FOR CYCLES */}
                <tr className="border-b-2 border-slate-950 bg-slate-50 text-slate-900 font-bold text-[10px] uppercase">
                  {Array.from({ length: numCiclos }).map((_, idx) => (
                    <React.Fragment key={idx}>
                      <th className="py-1.5 px-2 border-r border-slate-400">
                        Designado para
                      </th>
                      <th className="py-1.5 px-2 border-r border-slate-400 text-center w-24">
                        Data design.
                      </th>
                      <th
                        className={`py-1.5 px-2 text-center w-24 ${
                          idx < numCiclos - 1 ? 'border-r-2 border-slate-950' : ''
                        }`}
                      >
                        Data concl.
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-400">
                {cartoesFiltrados.map((c) => {
                  const designacoes = c.designacoes || [];

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-100/80 transition-colors group"
                    >
                      {/* Território Name / Number */}
                      <td className="py-2 px-2.5 border-r-2 border-slate-950 font-extrabold text-slate-950 align-middle">
                        <div className="flex items-center justify-between gap-1">
                          <span>{c.titulo}</span>
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-200 rounded transition-all no-print cursor-pointer"
                            title="Editar ciclos de designação"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {c.cidadeNome && (
                          <span className="block text-[10px] text-slate-600 font-normal truncate">
                            {c.cidadeNome}
                          </span>
                        )}
                      </td>

                      {/* Última data concluída */}
                      <td className="py-2 px-2.5 border-r-2 border-slate-950 text-center font-mono text-slate-900 font-bold align-middle">
                        {c.ultimaDataConcluida || '—'}
                      </td>

                      {/* Repeating Cycles Cells */}
                      {Array.from({ length: numCiclos }).map((_, idx) => {
                        const cycle = designacoes[idx];
                        return (
                          <React.Fragment key={idx}>
                            <td className="py-2 px-2 border-r border-slate-300 font-medium text-slate-900 align-middle truncate max-w-[130px]">
                              {cycle ? cycle.dirigenteNome : ''}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-300 text-center font-mono text-slate-900 align-middle">
                              {cycle ? cycle.dataDesignacao : ''}
                            </td>
                            <td
                              className={`py-2 px-2 text-center font-mono text-slate-900 font-bold align-middle ${
                                idx < numCiclos - 1 ? 'border-r-2 border-slate-950' : ''
                              }`}
                            >
                              {cycle ? cycle.dataConclusao || '' : ''}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* DOCUMENT FOOTER */}
        <div className="mt-6 pt-3 border-t border-slate-400 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600 gap-2">
          <span>
            Documento emitido em:{' '}
            <strong className="font-mono text-slate-900">
              {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </strong>
          </span>
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            S-13 Registro de Designação de Território • Total: {cartoesFiltrados.length} Territórios
          </span>
        </div>
      </div>

      {/* EDIT MODAL FOR DESIGNATION CYCLES */}
      {editingCartao && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-5 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/10">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-emerald-500" /> Editar Designações — {editingCartao.titulo}
                </h3>
                <p className="text-xs text-slate-400">
                  Adicione, altere ou remova ciclos de designação para este território
                </p>
              </div>
              <button
                onClick={() => setEditingCartao(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Field: Última Data Concluída */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Última Data Concluída
              </label>
              <input
                type="text"
                value={editUltimaData}
                onChange={(e) => setEditUltimaData(e.target.value)}
                placeholder="Ex: 15/10/2025"
                className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
              />
            </div>

            {/* List of existing cycles */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ciclos de Designação Cadastrados ({editDesignacoes.length})
              </h4>

              {editDesignacoes.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-center text-xs text-slate-400">
                  Nenhum ciclo cadastrado para este cartão.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editDesignacoes.map((cycle, idx) => (
                    <div
                      key={cycle.id || idx}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Dirigente ({idx + 1}º Ciclo)
                          </span>
                          <span className="font-bold text-slate-200 truncate block">
                            {cycle.dirigenteNome}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Data Designação
                          </span>
                          <span className="font-mono text-slate-300 block">
                            {cycle.dataDesignacao}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Data Conclusão
                          </span>
                          <span className="font-mono text-emerald-400 font-bold block">
                            {cycle.dataConclusao || 'Em andamento'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveCycleInModal(idx)}
                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remover este ciclo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form: Add New Cycle */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Adicionar Novo Ciclo de Designação
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Designado Para
                  </label>
                  {dirigentes.length > 0 ? (
                    <select
                      value={novoDirigente}
                      onChange={(e) => setNovoDirigente(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-white outline-none"
                    >
                      <option value="">Selecione o Dirigente</option>
                      {dirigentes.map((u) => (
                        <option key={u.id} value={u.nome}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={novoDirigente}
                      onChange={(e) => setNovoDirigente(e.target.value)}
                      placeholder="Nome do Dirigente..."
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-white outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Data Designação
                  </label>
                  <input
                    type="date"
                    value={novaDataDesignacao}
                    onChange={(e) => setNovaDataDesignacao(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Data Conclusão (Opcional)
                  </label>
                  <input
                    type="date"
                    value={novaDataConclusao}
                    onChange={(e) => setNovaDataConclusao(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCycleInModal}
                disabled={!novoDirigente.trim()}
                className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/50 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Incluir Ciclo na Lista
              </button>
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 border-t border-slate-200/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingCartao(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModal}
                disabled={savingEdit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
