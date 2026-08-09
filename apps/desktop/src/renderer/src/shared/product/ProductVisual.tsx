import {
  Beer,
  Candy,
  Coffee,
  CupSoda,
  GlassWater,
  IceCreamBowl,
  Package,
  Pizza,
  Sandwich,
} from 'lucide-react';

import type { ProductFallbackIcon } from '@gtrz/contracts';

interface ProductVisualProps {
  readonly imageDataUrl: string | null;
  readonly fallbackIcon: ProductFallbackIcon;
  readonly alt: string;
  readonly size?: 'small' | 'medium';
}

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

const ICONS = {
  package: Package,
  beer: Beer,
  'cup-soda': CupSoda,
  coffee: Coffee,
  sandwich: Sandwich,
  pizza: Pizza,
  'ice-cream': IceCreamBowl,
  'glass-water': GlassWater,
  candy: Candy,
} as const;

export function ProductVisual({
  imageDataUrl,
  fallbackIcon,
  alt,
  size = 'medium',
}: ProductVisualProps): React.JSX.Element {
  const Icon = ICONS[fallbackIcon];
  const className = `product-visual product-visual--${size}`;

  return imageDataUrl === null ? (
    <span className={className} aria-label={`Ícone de ${alt}`}>
      <Icon aria-hidden="true" />
    </span>
  ) : (
    <span className={className}>
      <img alt={alt} src={imageDataUrl} />
    </span>
  );
}
