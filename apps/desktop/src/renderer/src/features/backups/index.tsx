import { ArchiveRestore } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function BackupsPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Backups"
      description="Proteção do banco local com criação, importação, restauração e integridade."
      icon={ArchiveRestore}
      metrics={[
        { label: 'Último backup', value: 'Nunca', detail: 'Nenhum arquivo gerado.' },
        { label: 'Destino', value: 'Não definido', detail: 'Pasta, pendrive ou HD externo.' },
        {
          label: 'Integridade',
          value: 'Pendente',
          detail: 'Checksum será validado em cada pacote.',
        },
      ]}
      nextDeliveries={[
        'Backup automático, manual e ao encerrar evento.',
        'Importação com validação antes de alterar o banco atual.',
        'Restauração atômica com backup preventivo da base existente.',
      ]}
    />
  );
}
