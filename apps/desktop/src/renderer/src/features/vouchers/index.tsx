import { Ticket } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function VouchersPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Vouchers"
      description="Créditos vendidos ou de cortesia, com saldo, regras e histórico individual."
      icon={Ticket}
      metrics={[
        { label: 'Vouchers ativos', value: '0', detail: 'Nenhum voucher emitido.' },
        { label: 'Saldo disponível', value: 'R$ 0,00', detail: 'Crédito ainda não consumido.' },
        { label: 'Cancelados', value: '0', detail: 'Poderão ser reativados.' },
      ]}
      nextDeliveries={[
        'Código automático ou definido manualmente.',
        'Regras visuais por categoria, produto e quantidade.',
        'Uso parcial, pagamento misto e devolução proporcional em estornos.',
      ]}
    />
  );
}
