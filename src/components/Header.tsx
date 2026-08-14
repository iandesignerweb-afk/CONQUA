import React from 'react';
import { User } from '../types';
import { Menu, Search, Sun, Moon, Shield } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  currentUser: User;
  onOpenMobileSidebar: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  currentUser,
  onOpenMobileSidebar,
  darkMode,
  onToggleTheme,
  searchTerm,
  onSearchChange,
}) => {
  return (
    <header
      className={`sticky top-0 z-30 px-4 lg:px-8 py-3.5 border-b backdrop-blur-md transition-colors ${
        darkMode
          ? 'bg-slate-900/80 border-slate-800 text-slate-100'
          : 'bg-white/80 border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Title & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Global Search & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Pesquisa instantânea (Cidade, Bairro, Quadra, Usuário)..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs transition-all border ${
                darkMode
                  ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-400 focus:border-emerald-500'
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-emerald-500'
              } focus:outline-none focus:ring-1 focus:ring-emerald-500`}
            />
          </div>

          {/* Theme Switcher Quick Icon */}
          <button
            onClick={onToggleTheme}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Badge */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right">
              <p className="text-xs font-bold leading-tight">{currentUser.nome}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {currentUser.usuario}
              </p>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
