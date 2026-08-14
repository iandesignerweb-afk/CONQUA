import React, { useEffect, useState } from 'react';
import { DashboardStats } from '../types';
import { api } from '../services/api';
import {
  Building2,
  MapPin,
  Grid3x3,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart2,
  Users,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface DashboardViewProps {
  darkMode: boolean;
  onNavigateToQuadras: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  darkMode,
  onNavigateToQuadras,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .getDashboardStats()
      .then((data) => {
        if (isMounted) setStats(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-20 text-center text-sm text-slate-400 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Carregando painel de indicadores...
      </div>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">
            Painel Geral de Acompanhamento
          </span>
          <h2 className="text-2xl font-black mt-1">
            Controle de Visitas por Quadras
          </h2>
          <p className="text-xs text-emerald-100 max-w-xl mt-1 leading-relaxed">
            Acompanhe o andamento em tempo real de todas as cidades e bairros cadastrados.
          </p>
        </div>
        <button
          onClick={onNavigateToQuadras}
          className="px-5 py-3 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer shrink-0"
        >
          <Grid3x3 className="w-4 h-4" />
          Ver Grade de Quadras
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div
          className={`p-4 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Cidades
            </span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black">{stats.totalCidades}</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Bairros
            </span>
            <MapPin className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black">{stats.totalBairros}</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Quadras
            </span>
            <Grid3x3 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black">{stats.totalQuadras}</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
              Concluídas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500">
            {stats.quadrasConcluidas}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Pendentes
            </span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-400">
            {stats.quadrasPendentes}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
              Progresso
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500">
            {stats.percentualConcluido}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Progress Chart */}
        <div
          className={`p-6 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Progresso por Cidade (%)</h3>
              <p className="text-xs text-slate-400">
                Percentual de quadras concluídas em cada município
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.progressoPorCidade || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="cidade"
                  tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value}%`, 'Concluído']}
                />
                <Bar dataKey="percentual" radius={[8, 8, 0, 0]}>
                  {(stats?.progressoPorCidade || []).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Completions Chart */}
        <div
          className={`p-6 rounded-2xl border transition-colors shadow-sm ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Quadras Feitas por Usuário</h3>
              <p className="text-xs text-slate-400">
                Volume acumulado de marcações por agente
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stats?.progressoPorUsuario || []}
                margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="usuario"
                  tick={{ fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    borderColor: darkMode ? '#334155' : '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} quadras`, 'Concluídas']}
                />
                <Bar dataKey="totalConcluidas" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Bairros Progress List */}
      <div
        className={`p-6 rounded-2xl border transition-colors shadow-sm ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="font-bold text-sm mb-4">
          Bairros com Maior Andamento
        </h3>
        <div className="space-y-4">
          {(stats?.bairrosMaisAvançados || []).map((b, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold">
                  {b.bairro}{' '}
                  <span className="font-normal text-slate-400">({b.cidade})</span>
                </span>
                <span className="font-bold text-emerald-500">
                  {b.concluidas}/{b.total} quadras ({b.percentual}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${b.percentual}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
