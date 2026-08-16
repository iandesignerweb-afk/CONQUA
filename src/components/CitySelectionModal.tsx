import React, { useState } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import {
  MapPin,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface CitySelectionModalProps {
  currentUser: User;
  onCitySaved: (updatedUser: User) => void;
  darkMode?: boolean;
  canDismiss?: boolean;
  onClose?: () => void;
}

export const CitySelectionModal: React.FC<CitySelectionModalProps> = ({
  currentUser,
  onCitySaved,
  darkMode = true,
  canDismiss = false,
  onClose,
}) => {
  const [cidadeNome, setCidadeNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCidadeNome(val);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNome = cidadeNome.trim();

    if (!cleanNome) {
      setError('Por favor, digite o nome da sua cidade.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.setUserCity({
        cidadeNome: cleanNome,
      });

      setSuccess(true);

      const updatedUser: User = {
        ...currentUser,
        ...response.user,
        cidadeId: response.cidade.id,
        cidade_id: response.cidade.id,
        cidadeNome: response.cidade.nome,
        cidade_nome: response.cidade.nome,
        cidadeConfigurada: true,
        cidade_configurada: true,
      };

      setTimeout(() => {
        onCitySaved(updatedUser);
      }, 700);
    } catch (err: any) {
      console.error('Erro ao salvar cidade:', err);
      setError(err.message || 'Não foi possível salvar a cidade. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div
      id="city-selection-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="city-selection-card"
        className={`w-full max-w-lg rounded-2xl shadow-2xl border transition-all overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header Visual Banner */}
        <div className="relative p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-emerald-400/20 border border-emerald-300/30 rounded-full text-emerald-100">
                Configuração Inicial
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold mt-1">Qual é a sua Cidade?</h2>
            <p className="text-xs text-emerald-100/90 mt-0.5">
              Olá, <strong className="text-white">{currentUser.nome}</strong>! Para organizar suas
              quadras e territórios, precisamos saber em qual cidade você atua.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold">Cidade salva com sucesso!</h3>
              <p className="text-xs text-slate-400">
                Carregando os territórios de <strong>{cidadeNome}</strong>...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* City Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Nome da Cidade
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="input-cidade-nome"
                    type="text"
                    required
                    autoFocus
                    value={cidadeNome}
                    onChange={handleInputChange}
                    placeholder="Digite o nome da sua cidade (ex: São Paulo, Salvador...)"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      darkMode
                        ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Digite o nome da cidade em que você deseja administrar as quadras.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200/10">
                {canDismiss && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  id="btn-confirmar-cidade"
                  type="submit"
                  disabled={loading || !cidadeNome.trim()}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando Cidade...</span>
                    </>
                  ) : (
                    <>
                      <span>Salvar e Começar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
