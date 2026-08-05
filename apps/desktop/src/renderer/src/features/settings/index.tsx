import { Settings } from 'lucide-react';

import { ModulePage } from '../../shared/ui/ModulePage';

export function SettingsPage(): React.JSX.Element {
  return (
    <ModulePage
      title="Configurações"
      description="Preferências globais e do evento disponíveis somente para a Produção."
      icon={Settings}
      metrics={[
        { label: 'Perfil', value: 'Produção', detail: 'Direitos administrativos completos.' },
        { label: 'Modo', value: 'Offline', detail: 'Sem dependência de serviços externos.' },
        {
          label: 'Tema',
          value: 'GTRZ Dark',
          detail: 'Vermelho vivo, branco e superfícies escuras.',
        },
      ]}
      nextDeliveries={[
        'Alteração da senha de Produção e autorizações protegidas.',
        'Destino e frequência dos backups automáticos.',
        'Preferências de operação, aparência e comportamento por evento.',
      ]}
    />
  );
}
