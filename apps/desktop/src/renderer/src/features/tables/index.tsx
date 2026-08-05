import { TableProperties } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function TablesPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Mesas e balcão"
      description="Operação de vendas imediatas por mesa e pelo balcão permanente."
      icon={TableProperties}
      metrics={[
        { label: 'Mesas ativas', value: '0', detail: 'Nenhuma mesa criada no evento.' },
        { label: 'Vendas concluídas', value: '0', detail: 'Cada pagamento gera uma venda.' },
        { label: 'Balcão', value: 'Pendente', detail: 'Será criado junto com o evento.' },
      ]}
      nextDeliveries={[
        'Carrinho por categorias de comidas, bebidas e combos.',
        'Pagamento imediato simples ou misto com cálculo de troco.',
        'Histórico, ajustes e estornos com devolução de estoque.',
      ]}
    />
  );
}
