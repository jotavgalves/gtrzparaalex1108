import { ReceiptText } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function ExpensesPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Despesas"
      description="Controle de compromissos pagos, parciais e em aberto por categoria."
      icon={ReceiptText}
      metrics={[
        { label: 'Pago', value: 'R$ 0,00', detail: 'Saídas financeiras realizadas.' },
        { label: 'Parcial', value: 'R$ 0,00', detail: 'Valores pagos parcialmente.' },
        { label: 'Em aberto', value: 'R$ 0,00', detail: 'Compromissos ainda pendentes.' },
      ]}
      nextDeliveries={[
        'Categorias e nomes personalizados pela Produção.',
        'Parcelas com valor, data, forma e observação.',
        'Reflexo automático no caixa e no resultado projetado.',
      ]}
    />
  );
}
