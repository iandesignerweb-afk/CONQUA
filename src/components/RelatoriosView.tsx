import React, { useEffect, useState } from 'react';
import { ReportData } from '../types';
import { api } from '../services/api';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Printer,
  Award,
  Users,
  Grid3x3,
  TrendingUp,
} from 'lucide-react';

interface RelatoriosViewProps {
  darkMode: boolean;
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({ darkMode }) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .getRelatorios()
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-sm text-slate-400 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Carregando dados do relatório...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div
        className={`p-6 rounded-2xl border transition-colors shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Relatório Completo de Desempenho</h2>
            <p className="text-xs text-slate-400">
              Métricas detalhadas de produtividade, avanço de municípios e bairros
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Exportar Relatório
        </button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total de Quadras
          </span>
          <p className="text-3xl font-black">{data.totalQuadras}</p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">
            Quadras Concluídas
          </span>
          <p className="text-3xl font-black text-emerald-500">
            {data.quadrasConcluidas}
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Quadras Pendentes
          </span>
          <p className="text-3xl font-black text-slate-400">
            {data.quadrasPendentes}
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">
            Percentual Geral
          </span>
          <p className="text-3xl font-black text-emerald-500">
            {data.percentualConcluido}%
          </p>
        </div>
      </div>

      {/* Highlights Cards (Cidade mais avançada & Bairro mais avançado) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-2xl border transition-colors shadow-sm flex items-center gap-4 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Cidade Mais Avançada
            </span>
            <p className="text-sm font-extrabold text-white mt-0.5">
              {data.cidadeMaisAvançada}
            </p>
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-colors shadow-sm flex items-center gap-4 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Bairro Mais Avançado
            </span>
            <p className="text-sm font-extrabold text-white mt-0.5">
              {data.bairroMaisAvançado}
            </p>
          </div>
        </div>

        <div
          className={`p-5 rounded-2xl border transition-colors shadow-sm flex items-center gap-4 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Tempo Médio Estimado
            </span>
            <p className="text-sm font-extrabold text-white mt-0.5">
              {data.tempoMedioEstimado}
            </p>
          </div>
        </div>
      </div>

      {/* User Performance Table */}
      <div
        className={`p-6 rounded-2xl border transition-colors shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500" /> Desempenho Por Agente / Usuário
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Nome do Agente</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Permissão</th>
                <th className="py-3 px-4 text-right">Quadras Concluídas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(data?.userStats || []).map((u) => (
                <tr
                  key={u.usuarioId || u.usuario}
                  className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold">{u.nome}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">@{u.usuario}</td>
                  <td className="py-3.5 px-4 text-slate-400">{u.permissao}</td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-500 text-sm">
                    {u.quadrasFeitas} quadras
                  </td>
                </tr>
              ))}
              {(!data?.userStats || data.userStats.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    Nenhum agente com quadras concluídas no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
