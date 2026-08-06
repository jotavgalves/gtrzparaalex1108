import { TicketPlus } from 'lucide-react';
import { useState } from 'react';

import type { CreateVoucherInput } from '@gtrz/contracts';

interface VoucherFormProps {
  readonly busy: boolean;
  readonly onSubmit: (input: CreateVoucherInput) => Promise<void>;
}

function parseMoney(value: string): number {
  const amount = Number(value.trim().replace(',', '.'));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function VoucherForm({ busy, onSubmit }: VoucherFormProps): React.JSX.Element {
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [balance, setBalance] = useState('');

  return (
    <form
      className="voucher-form"
      onSubmit={(event) => {
        event.preventDefault();
        const normalizedCode = code.trim();
        const initialBalanceCents = parseMoney(balance);
        const input =
          normalizedCode.length === 0
            ? { label: label.trim(), initialBalanceCents }
            : { code: normalizedCode, label: label.trim(), initialBalanceCents };

        void onSubmit(input).then(() => {
          setLabel('');
          setCode('');
          setBalance('');
        });
      }}
    >
      <div className="panel__heading">
        <TicketPlus size={20} aria-hidden="true" />
        <div>
          <h2>Emitir voucher</h2>
          <p>Deixe o código vazio para gerar um identificador automático.</p>
        </div>
      </div>
      <label className="form-field">
        <span>Identificação</span>
        <input
          disabled={busy}
          maxLength={100}
          onChange={(event) => {
            setLabel(event.target.value);
          }}
          placeholder="Ex.: Crédito patrocinador"
          required
          value={label}
        />
      </label>
      <label className="form-field">
        <span>Código opcional</span>
        <input
          disabled={busy}
          maxLength={32}
          onChange={(event) => {
            setCode(event.target.value.toLocaleUpperCase('pt-BR'));
          }}
          placeholder="Gerado automaticamente"
          value={code}
        />
      </label>
      <label className="form-field">
        <span>Saldo inicial</span>
        <input
          disabled={busy}
          inputMode="decimal"
          onChange={(event) => {
            setBalance(event.target.value);
          }}
          placeholder="100,00"
          required
          value={balance}
        />
      </label>
      <button
        className="button"
        disabled={busy || label.trim().length < 2 || parseMoney(balance) <= 0}
        type="submit"
      >
        Emitir voucher
      </button>
    </form>
  );
}
