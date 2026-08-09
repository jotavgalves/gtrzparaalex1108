import type { ProductFallbackIcon } from '@gtrz/contracts';

export const PRODUCT_ICON_OPTIONS: readonly {
  readonly value: ProductFallbackIcon;
  readonly label: string;
}[] = [
  { value: 'package', label: 'Pacote' },
  { value: 'beer', label: 'Cerveja' },
  { value: 'cup-soda', label: 'Copo / refrigerante' },
  { value: 'coffee', label: 'Café' },
  { value: 'sandwich', label: 'Sanduíche' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'ice-cream', label: 'Sorvete' },
  { value: 'glass-water', label: 'Água / bebida' },
  { value: 'candy', label: 'Doce' },
];
