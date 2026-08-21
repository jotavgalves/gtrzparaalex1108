import { Laptop, Link2, Server, Unplug } from 'lucide-react';
import { useEffect, useState, type SyntheticEvent } from 'react';

import type { NetworkState } from '@gtrz/contracts';

function modeLabel(state: NetworkState): string {
  if (state.mode === 'host') return 'Servidor';
  if (state.mode === 'client')
    return state.connected ? 'Cliente conectado' : 'Cliente desconectado';
  return 'Somente este computador';
}

export function NetworkSettingsPanel(): React.JSX.Element {
  const [state, setState] = useState<NetworkState | null>(null);
  const [host, setHost] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const nextState = await window.gtrz.network.getState();
      setState(nextState);
      if (nextState.remoteUrl !== null) setHost(nextState.remoteUrl);
    } catch (refreshError: unknown) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Não foi possível consultar o modo de rede.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function runAction(action: () => Promise<NetworkState>, success: string): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const nextState = await action();
      setState(nextState);
      if (nextState.remoteUrl !== null) setHost(nextState.remoteUrl);
      setMessage(success);
    } catch (actionError: unknown) {
      setError(
        actionError instanceof Error ? actionError.message : 'Não foi possível alterar a rede.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConnect(formEvent: SyntheticEvent<HTMLFormElement>): Promise<void> {
    formEvent.preventDefault();
    await runAction(
      () => window.gtrz.network.connect({ host }),
      'Este computador agora usa o banco de dados do servidor GTRZ.',
    );
  }

  return (
    <article className="panel form-panel">
      <div className="panel__heading">
        <Server size={20} aria-hidden="true" />
        <div>
          <h2>Rede entre computadores</h2>
          <p>Escolha o papel deste computador. A rede física pode ser hotspot, Wi-Fi ou cabo.</p>
        </div>
      </div>

      <div className="security-summary">
        <span className="security-summary__icon" aria-hidden="true">
          <Laptop size={22} />
        </span>
        <div>
          <span>Modo atual</span>
          <strong>{loading || state === null ? 'Verificando...' : modeLabel(state)}</strong>
          {state?.lastError === null || state?.lastError === undefined ? null : (
            <p className="form-error">{state.lastError}</p>
          )}
        </div>
      </div>

      {state?.mode === 'host' ? (
        <div className="form-field">
          <span>Endereços para conectar o segundo computador</span>
          {state.hostAddresses.length === 0 ? (
            <small>Nenhum endereço IPv4 de rede foi encontrado.</small>
          ) : (
            state.hostAddresses.map((address) => <code key={address}>{address}</code>)
          )}
          <small>Mantenha o GTRZ aberto neste computador durante toda a operação.</small>
        </div>
      ) : null}

      {state?.mode === 'client' && state.remoteUrl !== null ? (
        <div className="form-field">
          <span>Servidor configurado</span>
          <code>{state.remoteUrl}</code>
          <small>
            As vendas e alterações deste terminal são executadas diretamente no banco do servidor.
          </small>
        </div>
      ) : null}

      <div className="form-field">
        <span>Este computador será o principal</span>
        <button
          className="button button--primary"
          disabled={submitting || state?.mode === 'host'}
          onClick={() =>
            void runAction(
              () => window.gtrz.network.startHost(),
              'Servidor GTRZ iniciado neste computador.',
            )
          }
          type="button"
        >
          <Server size={17} aria-hidden="true" />
          Hospedar evento neste computador
        </button>
      </div>

      <form onSubmit={(formEvent) => void handleConnect(formEvent)}>
        <label className="form-field">
          <span>Conectar este computador a um servidor</span>
          <input
            disabled={submitting}
            onChange={(inputEvent) => setHost(inputEvent.target.value)}
            placeholder="Ex.: 192.168.137.1 ou http://192.168.137.1:3747"
            required
            type="text"
            value={host}
          />
        </label>
        <button className="button button--primary" disabled={submitting} type="submit">
          <Link2 size={17} aria-hidden="true" />
          Conectar ao servidor
        </button>
      </form>

      <div className="form-field">
        <span>Voltar ao funcionamento independente</span>
        <button
          className="button button--secondary"
          disabled={submitting || state?.mode === 'local'}
          onClick={() =>
            void runAction(
              () => window.gtrz.network.useLocal(),
              'Este computador voltou a usar somente o próprio banco local.',
            )
          }
          type="button"
        >
          <Unplug size={17} aria-hidden="true" />
          Usar somente este computador
        </button>
      </div>

      <small>
        Nesta etapa, o evento e o perfil ativo são compartilhados entre os terminais e a impressão
        de vendas feitas pelo cliente ocorre no computador servidor.
      </small>

      {error === null ? null : <p className="form-error">{error}</p>}
      {message === null ? null : <p className="form-success">{message}</p>}
    </article>
  );
}
