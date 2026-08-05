import { CreditCard } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function CashPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Caixa administrativo"
      description="Conciliação de entradas, faturamento, despesas e resultado do evento."
      icon={CreditCard}
      metrics={[
        { label: 'Dinheiro', value: 'R$ 0,00', detail: 'Entradas efetivamente recebidas.' },
        { label: 'Pix e cartão', value: 'R$ 0,00', detail: 'Separados por forma de pagamento.' },
        { label: 'Resultado projetado', value: 'R$ 0,00', detail: 'Pode permanecer negativo.' },
      ]}
      nextDeliveries={[
        'Abertura, fechamento, suprimento e sangria.',
        'Faturamento comercial separado do fluxo realizado.',
        'Vouchers registrados sem duplicidade de receita.',
      ]}
    />
  );
}
