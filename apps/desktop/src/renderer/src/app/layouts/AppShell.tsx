import { Database, Server, Shield, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router';

import type { NetworkState, SystemInfo } from '@gtrz/contracts';

import gtrzLockup from '../../assets/brand/gtrz-lockup.svg';
import { navigationModules } from '../../shared/navigation/modules';
import { ProfileSwitcher } from '../../shared/session/ProfileSwitcher';
import { useSession } from '../../shared/session/session-context';

function navigationClassName({ isActive }: { readonly isActive: boolean }): string {
  return isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link';
}

function formatEventDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(timestamp);
}

function networkHeading(state: NetworkState | null): string {
  if (state?.mode === 'host') return 'Servidor GTRZ';
  if (state?.mode === 'client') return state.connected ? 'Cliente GTRZ conectado' : 'Cliente desconectado';
  return 'Operação local';
}

function networkDescription(state: NetworkState | null): string {
  if (state?.mode === 'host') {
    return state.hostAddresses[0] ?? 'Compartilhando o banco deste computador na rede local';
  }
  if (state?.mode === 'client') {
    if (!state.connected) return state.lastError ?? 'Não foi possível alcançar o computador servidor';
    return state.remoteUrl === null ? 'Conectado ao servidor GTRZ' : `Servidor: ${state.remoteUrl}`;
  }
  return 'Dados armazenados exclusivamente neste computador';
}

export function AppShell(): React.JSX.Element {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const { state: sessionState, loading: sessionLoading, error: sessionError } = useSession();
  const activeProfile = sessionState?.profile ?? 'production';
  const activeEvent = sessionState?.activeEvent ?? null;

  useEffect(() => {
    let mounted = true;

    void window.gtrz.system
      .getInfo()
      .then((info) => {
        if (mounted) {
          setSystemInfo(info);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Falha ao consultar o sistema.';
          setSystemError(message);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function refreshNetwork(): Promise<void> {
      try {
        const state = await window.gtrz.network.getState();
        if (mounted) setNetworkState(state);
      } catch {
        // A sessão e as operações exibem os erros de conexão relevantes ao usuário.
      }
    }

    void refreshNetwork();
    const interval = window.setInterval(() => void refreshNetwork(), 3000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const visibleModules = useMemo(
    () => navigationModules.filter((module) => module.profiles.includes(activeProfile)),
    [activeProfile],
  );

  const networkHealthy =
    networkState?.mode === 'host' ||
    networkState?.mode === 'local' ||
    (networkState?.mode === 'client' && networkState.connected);
  const NetworkIcon =
    networkState?.mode === 'host'
      ? Server
      : networkState?.mode === 'client' && networkState.connected
        ? Wifi
        : WifiOff;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup" aria-label="GTRZ System">
          <img alt="GTRZ" className="brand-lockup__logo" src={gtrzLockup} />
          <span className="brand-lockup__product">System</span>
        </div>

        <div className="event-context">
          <span>Evento ativo</span>
          <strong>{activeEvent?.name ?? 'Nenhum evento selecionado'}</strong>
          <small>
            {activeEvent === null
              ? activeProfile === 'production'
                ? 'Selecione um evento no módulo Eventos.'
                : 'A Produção precisa selecionar um evento.'
              : `Operação de ${formatEventDate(activeEvent.startsAt)}`}
          </small>
        </div>

        <nav className="sidebar-nav" aria-label="Módulos do sistema">
          {visibleModules.map((module) => {
            const Icon = module.icon;
            return (
              <NavLink
                className={navigationClassName}
                end={module.path === '/'}
                key={module.key}
                to={module.path}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{module.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <span className="profile-card__icon" aria-hidden="true">
              <Shield size={18} />
            </span>
            <div>
              <span>Perfil atual</span>
              <strong>{activeProfile === 'production' ? 'Produção' : 'Caixa'}</strong>
            </div>
          </div>
          <ProfileSwitcher />
          <small>v{systemInfo?.version ?? '0.1.0'}</small>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <strong>{networkHeading(networkState)}</strong>
            <span>
              {sessionLoading
                ? 'Carregando sessão'
                : (sessionError ?? networkDescription(networkState))}
            </span>
          </div>

          <div className="topbar-status" aria-live="polite">
            <span
              className={
                networkHealthy
                  ? 'status-pill status-pill--success'
                  : 'status-pill status-pill--pending'
              }
              title={networkState?.lastError ?? undefined}
            >
              <NetworkIcon size={16} aria-hidden="true" />
              {networkState?.mode === 'host'
                ? 'Servidor'
                : networkState?.mode === 'client'
                  ? networkState.connected
                    ? 'Conectado'
                    : 'Sem servidor'
                  : 'Local'}
            </span>
            <span
              className={
                systemInfo?.databaseReady === true
                  ? 'status-pill status-pill--success'
                  : 'status-pill status-pill--pending'
              }
              title={systemError ?? undefined}
            >
              <Database size={16} aria-hidden="true" />
              {systemError !== null
                ? 'Banco indisponível'
                : systemInfo?.databaseReady === true
                  ? networkState?.mode === 'client'
                    ? 'Banco local reserva'
                    : 'Banco íntegro'
                  : 'Verificando banco'}
            </span>
          </div>
        </header>

        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
