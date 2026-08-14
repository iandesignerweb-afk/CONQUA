import React, { useEffect, useState } from 'react';
import { Quadra, QuadraHistorico } from '../types';
import { api } from '../services/api';
import {
  X,
  CheckCircle2,
  Clock,
  User as UserIcon,
  MapPin,
  Building2,
  History,
  AlertCircle,
} from 'lucide-react';

interface QuadraDetailModalProps {
  quadra: Quadra;
  onClose: () => void;
  darkMode: boolean;
}

export const QuadraDetailModal: React.FC<QuadraDetailModalProps> = ({
  quadra,
  onClose,
  darkMode,
}) => {
  const [history, setHistory] = useState<QuadraHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .getQuadraHistorico(quadra.id)
      .then((data) => {
        if (isMounted) setHistory(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [quadra.id]);

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Não registrado';
    const date = new Date(isoStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isFeita = quadra.status === 'Feita';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden relative transition-all ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`p-6 border-b flex justify-between items-start ${
            isFeita
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-slate-500/10 border-slate-500/20'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${
                isFeita
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-600 text-white'
              }`}
            >
              {quadra.numero}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isFeita
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                  }`}
                >
                  {quadra.status}
                </span>
              </div>
              <h3 className="text-xl font-bold mt-1">Quadra {quadra.numero}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Location details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" /> Cidade
              </span>
              <p className="text-sm font-bold truncate">{quadra.cidadeNome}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Bairro
              </span>
              <p className="text-sm font-bold truncate">{quadra.bairroNome}</p>
            </div>
          </div>

          {/* Execution details */}
          {isFeita ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" /> Quadra Concluída
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-400 block mb-0.5">Usuário Responsável</span>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                    {quadra.usuarioNome || 'Não informado'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Data e Hora de Conclusão</span>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {formatDate(quadra.concluidaEm)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center gap-3 text-xs text-slate-400">
              <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />
              <span>
                Esta quadra ainda não foi marcada como realizada. Clique no card na tela de controle para alterá-la para "Feita".
              </span>
            </div>
          )}

          {/* Timeline / History */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-500" /> Histórico de Alterações
            </h4>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Carregando histórico...
              </div>
            ) : !history || history.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Nenhum histórico registrado até o momento.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(history || []).map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {h.acao}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Por {h.usuarioNome}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDate(h.dataHora)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
