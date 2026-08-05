import { ClipboardList } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function EventsPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Eventos"
      description="Cada operação do GTRZ System será isolada em um evento próprio."
      icon={ClipboardList}
      metrics={[
        { label: 'Eventos ativos', value: '0', detail: 'Nenhum evento em operação.' },
        { label: 'Eventos encerrados', value: '0', detail: 'Histórico preservado por evento.' },
        { label: 'Evento selecionado', value: 'Nenhum', detail: 'Necessário para operar vendas.' },
      ]}
      nextDeliveries={[
        'Criação, edição, encerramento, reabertura e arquivamento.',
        'Balcão fixo criado automaticamente em cada evento.',
        'Separação rigorosa de estoque, vendas, caixa e auditoria.',
      ]}
    />
  );
}
