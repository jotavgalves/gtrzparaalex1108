import { TicketPlus } from 'lucide-react';
import { useState } from 'react';

import type { CreateVoucherInput, VoucherServicePoint } from '@gtrz/contracts';

interface VoucherFormProps {
  readonly busy: boolean;
  readonly servicePoints: readonly VoucherServicePoint[];
  readonly onSubmit: (input: CreateVoucherInput) => Promise<void>;
}

function parseMoney(value: string): number {
  const amount = Number(value.trim().replace(',', '.'));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function VoucherForm({
  busy,
  servicePoints,
  onSubmit,
}: VoucherFormProps): React.JSX.Element {
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [balance, setBalance] = useState('');
  const [servicePointId, setServicePointId] = useState('');

  return (
    <form
      className="voucher-form"
      onSubmit={(event) => {
        event.preventDefault();
        const normalizedCode = code.trim();
        const initialBalanceCents = parseMoney(balance);
        const base = {
          label: label.trim(),
          initialBalanceCents,
          servicePointId,
        };
        const input =
          normalizedCode.length === 0 ? base : { ...base, code: normalizedCode };

        void onSubmit(input).then(() => {
          setLabel('');
          setCode('');
          setBalance('');
          setServicePointId('');
        });
      }}
    >
      <div className="panel__heading">
        <TicketPlus size={20} aria-hidden="true" />
        <div>
          <h2>Emitir voucher</h2>
          <p>O voucher nasce vinculado a uma mesa e só poderá ser usado nela.</p>
        </div>
      </div>
      <label className="form-field">
        <span>Mesa vinculada</span>
        <select
          disabled={busy || servicePoints.length === 0}
          onChange={(event) => {
            setServicePointId(event.target.value);
          }}
          required
          value={servicePointId}
        >
          <option value="">Selecione a mesa</option>
          {servicePoints.map((servicePoint) => (
            <option key={servicePoint.id} value={servicePoint.id}>
              {servicePoint.label}
            </option>
          ))}
        </select>
      </label>
      {servicePoints.length === 0 ? (
        <p className="form-hint">Cadastre uma mesa em Mesas e balcão antes de emitir vouchers.</p>
      ) : null}
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
        disabled={
          busy ||
          servicePointId.length === 0 ||
          label.trim().length < 2 ||
          parseMoney(balance) <= 0
        }
        type="submit"
      >
        Emitir voucher
      </button>
    </form>
  );
}
