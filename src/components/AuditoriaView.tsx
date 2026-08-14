import React, { useEffect, useState } from 'react';
import { AuditLog } from '../types';
import { api } from '../services/api';
import { ShieldCheck, Search, Clock, User as UserIcon, Monitor } from 'lucide-react';

interface AuditoriaViewProps {
  darkMode: boolean;
}

export const AuditoriaView: React.FC<AuditoriaViewProps> = ({ darkMode }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    api
      .getAuditoria(search)
      .then((data) => setLogs(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Logs de Auditoria e Segurança</h2>
              <p className="text-xs text-slate-400">
                Registro histórico completo de ações, alterações e acessos no sistema
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por ação, usuário ou detalhe..."
              className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              } focus:outline-none focus:ring-1 focus:ring-emerald-500`}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Carregando registros de auditoria...
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-12 text-xs text-slate-400">
            Nenhum registro de auditoria encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Detalhes</th>
                  <th className="py-3 px-4 text-right">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {(logs || []).map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {formatDate(log.dataHora)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200 whitespace-nowrap">
                      {log.usuarioNome}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {log.acao}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-md">
                      {log.detalhes}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                      {log.ip || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
