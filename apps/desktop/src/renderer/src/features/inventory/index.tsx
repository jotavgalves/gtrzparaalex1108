import { Boxes } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function InventoryPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Estoque"
      description="Cadastro de produtos, custos, preços, margens, alertas e combos."
      icon={Boxes}
      metrics={[
        { label: 'Produtos ativos', value: '0', detail: 'Catálogo ainda não iniciado.' },
        { label: 'Itens em alerta', value: '0', detail: 'Limites serão definidos por produto.' },
        { label: 'Valor em estoque', value: 'R$ 0,00', detail: 'Calculado pelo custo registrado.' },
      ]}
      nextDeliveries={[
        'Entradas, correções, perdas, quebras, cortesias e devoluções.',
        'Lucro bruto e margem percentual por produto.',
        'Combos com custo, lucro e comparação com venda individual.',
      ]}
    />
  );
}
