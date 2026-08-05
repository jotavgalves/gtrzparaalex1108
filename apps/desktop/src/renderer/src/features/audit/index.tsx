import { ShieldCheck } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function AuditPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Auditoria"
      description="Registro imutável de criações, alterações, vendas, estornos e acessos protegidos."
      icon={ShieldCheck}
      metrics={[
        { label: 'Registros hoje', value: '0', detail: 'Nenhuma operação auditada.' },
        {
          label: 'Ações protegidas',
          value: '0',
          detail: 'Autorizações por senha aparecerão aqui.',
        },
        { label: 'Falhas', value: '0', detail: 'Erros técnicos e recusas rastreáveis.' },
      ]}
      nextDeliveries={[
        'Filtros por módulo, usuário, ação, data e evento.',
        'Valores anteriores e posteriores nas alterações.',
        'Correlação entre venda, estoque, voucher e financeiro.',
      ]}
    />
  );
}
