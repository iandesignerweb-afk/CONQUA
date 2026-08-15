import React, { useEffect, useState } from 'react';
import { User } from './types';
import { api, getStoredToken } from './services/api';
import { Sidebar, NavItem } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { QuadrasControlView } from './components/QuadrasControlView';
import { CartoesView } from './components/CartoesView';
import { UsuariosView } from './components/UsuariosView';
import { RelatoriosView } from './components/RelatoriosView';
import { RegistroTerritoriosView } from './components/RegistroTerritoriosView';
import { AuditoriaView } from './components/AuditoriaView';
import { CitySelectionModal } from './components/CitySelectionModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [showCityModal, setShowCityModal] = useState<boolean>(false);

  // App Layout State
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('quadras_theme');
    return saved ? saved === 'dark' : true; // Default dark theme
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Apply dark class to document HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('quadras_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('quadras_theme', 'light');
    }
  }, [darkMode]);

  // Validate stored authentication on start
  useEffect(() => {
    const checkToken = () => {
      const token = getStoredToken();
      if (token) {
        api
          .getMe()
          .then((user) => setCurrentUser(user))
          .catch(() => {
            api.logout();
            setCurrentUser(null);
          })
          .finally(() => setAuthChecking(false));
      } else {
        setAuthChecking(false);
      }
    };

    checkToken();

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('auth_unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth_unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-semibold">
          Iniciando Sistema de Controle de Quadras...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  const getPageTitles = (): { title: string; subtitle: string } => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Dashboard do Sistema',
          subtitle: 'Visão geral de bairros, cidades e progresso das visitas',
        };
      case 'quadras':
        return {
          title: 'Controle de Quadras',
          subtitle: currentUser?.permissao === 'Administrador'
            ? 'Grade interativa de acompanhamento e marcação de quadras'
            : 'Cartões de territórios designados para o seu trabalho de campo',
        };
      case 'cartoes':
        return {
          title: 'Gestão de Cartões',
          subtitle: 'Cartões com grupos de quadras vinculadas e designados por usuário',
        };
      case 'relatorios':
        return {
          title: 'Relatórios de Desempenho',
          subtitle: 'Métricas completas por usuário, município e tempo de conclusão',
        };
      case 'registro-territorios':
        return {
          title: 'Registro de Designação de Território (S-13)',
          subtitle: 'Documento oficial de controle e histórico anual de designações de territórios',
        };
      case 'usuarios':
        return {
          title: 'Gestão de Usuários',
          subtitle: 'Controle de acessos, cadastro de usuários e perfis de acesso',
        };
      case 'auditoria':
        return {
          title: 'Logs de Auditoria',
          subtitle: 'Rastreabilidade e histórico de operações do sistema',
        };
      default:
        return { title: 'Quadras Control', subtitle: 'Sistema de Visitas' };
    }
  };

  const pageMeta = getPageTitles();

  // Verifica se o usuário precisa configurar a cidade (onboarding para novos usuários)
  const isMissingCity =
    !currentUser.cidadeNome &&
    !currentUser.cidade_nome &&
    !currentUser.cidadeConfigurada &&
    !currentUser.cidade_configurada;

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Modal obrigatório para novos usuários sem cidade ou sob demanda */}
      {(isMissingCity || showCityModal) && (
        <CitySelectionModal
          currentUser={currentUser}
          darkMode={darkMode}
          canDismiss={!isMissingCity}
          onClose={() => setShowCityModal(false)}
          onCitySaved={(updatedUser) => {
            setCurrentUser(updatedUser);
            setShowCityModal(false);
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setMobileSidebarOpen(false);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenCityModal={() => setShowCityModal(true)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          currentUser={currentUser}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode(!darkMode)}
          searchTerm={globalSearch}
          onSearchChange={(val) => {
            setGlobalSearch(val);
            if (val && currentTab !== 'quadras') {
              setCurrentTab('quadras');
            }
          }}
          onChangeCity={() => setShowCityModal(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              darkMode={darkMode}
              onNavigateToQuadras={() => setCurrentTab('quadras')}
            />
          )}

          {currentTab === 'quadras' && (
            <QuadrasControlView
              currentUser={currentUser}
              darkMode={darkMode}
              globalSearch={globalSearch}
            />
          )}

          {currentTab === 'cartoes' && (
            <CartoesView
              currentUser={currentUser}
              darkMode={darkMode}
            />
          )}

          {currentTab === 'relatorios' && (
            <RelatoriosView darkMode={darkMode} />
          )}

          {currentTab === 'registro-territorios' && (
            <RegistroTerritoriosView currentUser={currentUser} darkMode={darkMode} />
          )}

          {currentTab === 'usuarios' && currentUser.permissao === 'Administrador' && (
            <UsuariosView currentUser={currentUser} darkMode={darkMode} />
          )}

          {currentTab === 'auditoria' && currentUser.permissao === 'Administrador' && (
            <AuditoriaView darkMode={darkMode} />
          )}
        </main>
      </div>
    </div>
  );
}
