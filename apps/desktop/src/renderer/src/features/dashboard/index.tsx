import { LayoutDashboard } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function DashboardPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Visão geral"
      description="Painel consolidado do evento, com vendas, despesas, estoque e resultado."
      icon={LayoutDashboard}
      metrics={[
        { label: 'Evento ativo', value: 'Nenhum', detail: 'Crie ou selecione um evento.' },
        { label: 'Faturamento', value: 'R$ 0,00', detail: 'Sem movimentações registradas.' },
        { label: 'Resultado', value: 'R$ 0,00', detail: 'Receitas menos custos e despesas.' },
      ]}
      nextDeliveries={[
        'Indicadores comerciais e financeiros separados.',
        'Alertas de estoque, vouchers e despesas.',
        'Resumo operacional sem acesso direto aos módulos internos.',
      ]}
    />
  );
}
