import React from 'react';
import { User } from '../types';
import {
  LayoutDashboard,
  Grid3x3,
  CreditCard,
  Building2,
  BarChart3,
  ShieldCheck,
  Users,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  MapPin,
  FileText,
} from 'lucide-react';

export type NavItem =
  | 'dashboard'
  | 'quadras'
  | 'cartoes'
  | 'relatorios'
  | 'registro-territorios'
  | 'auditoria'
  | 'usuarios';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  currentUser: User;
  onLogout: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  darkMode,
  onToggleTheme,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isAdmin = currentUser.permissao === 'Administrador';

  const navItems = [
    {
      id: 'dashboard' as NavItem,
      label: 'Dashboard',
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      id: 'quadras' as NavItem,
      label: 'Controle de Quadras',
      icon: Grid3x3,
      adminOnly: false,
      badge: 'Principal',
    },
    {
      id: 'cartoes' as NavItem,
      label: 'Gestão de Cartões',
      icon: CreditCard,
      adminOnly: true,
    },
    {
      id: 'relatorios' as NavItem,
      label: 'Relatórios',
      icon: BarChart3,
      adminOnly: false,
    },
    {
      id: 'registro-territorios' as NavItem,
      label: 'Registro Territórios',
      icon: FileText,
      adminOnly: true,
      badge: 'S-13',
    },
    {
      id: 'usuarios' as NavItem,
      label: 'Usuários',
      icon: Users,
      adminOnly: true,
    },
    {
      id: 'auditoria' as NavItem,
      label: 'Auditoria',
      icon: ShieldCheck,
      adminOnly: true,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 z-50 transition-transform duration-300 ease-in-out flex flex-col ${
          darkMode
            ? 'bg-slate-900 border-r border-slate-800 text-slate-200'
            : 'bg-white border-r border-slate-200 text-slate-700 shadow-lg'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-200/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xl shadow-sm">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`font-bold text-base leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Quadras Control
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                Gestão de Visitas
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
            {currentUser.nome.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {currentUser.nome}
            </p>
            <span
              className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                isAdmin
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {currentUser.permissao}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                      : darkMode
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'opacity-70'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && !isActive && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Theme Switch & Logout Footer */}
        <div className="p-3 border-t border-slate-200/10 space-y-2">
          <button
            onClick={onToggleTheme}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              darkMode
                ? 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {darkMode ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span>{darkMode ? 'Modo Escuro' : 'Modo Claro'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              {darkMode ? 'Escuro' : 'Claro'}
            </span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};
