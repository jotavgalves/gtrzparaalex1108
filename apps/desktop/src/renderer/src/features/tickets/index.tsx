import { Store } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function TicketsPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Ingressos"
      description="Lotes, vendas, cortesias e códigos únicos operados somente pela Produção."
      icon={Store}
      metrics={[
        { label: 'Lotes ativos', value: '0', detail: 'Nenhum lote cadastrado.' },
        { label: 'Ingressos vendidos', value: '0', detail: 'Vendas individuais ou em grupo.' },
        { label: 'Cortesias', value: '0', detail: 'Separadas do faturamento.' },
      ]}
      nextDeliveries={[
        'Códigos automáticos ou informados manualmente.',
        'Registro por Sympla, WhatsApp ou dinheiro.',
        'Edição, cancelamento e exclusão lógica auditada.',
      ]}
    />
  );
}
