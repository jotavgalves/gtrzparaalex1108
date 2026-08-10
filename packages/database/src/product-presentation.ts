import type { DatabaseContext } from './types';

export type DatabaseProductFallbackIcon =
  | 'package'
  | 'beer'
  | 'cup-soda'
  | 'coffee'
  | 'sandwich'
  | 'pizza'
  | 'ice-cream'
  | 'glass-water'
  | 'candy';

export interface DatabaseProductPresentation {
  readonly imageDataUrl: string | null;
  readonly fallbackIcon: DatabaseProductFallbackIcon;
}

const FALLBACK_ICONS = new Set<DatabaseProductFallbackIcon>([
  'package',
  'beer',
  'cup-soda',
  'coffee',
  'sandwich',
  'pizza',
  'ice-cream',
  'glass-water',
  'candy',
]);

function imageKey(productId: string): string {
  return `product.image:${productId}`;
}

function iconKey(productId: string): string {
  return `product.icon:${productId}`;
}

function readMeta(database: DatabaseContext, key: string): string | null {
  const row = database.sqlite.prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as
    | { readonly value: string }
    | undefined;
  return row?.value ?? null;
}

function writeMeta(database: DatabaseContext, key: string, value: string): void {
  database.sqlite
    .prepare(
      `INSERT INTO app_meta (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value, Date.now());
}

export function validateProductImageDataUrl(value: string | null): string | null {
  if (value === null) return null;
  if (value.length > 750_000) {
    throw new Error('A foto do produto ficou muito grande. Escolha outra imagem.');
  }
  if (!/^data:image\/(?:png|jpeg|webp);base64,/iu.test(value)) {
    throw new Error('A foto do produto precisa ser PNG, JPG ou WebP.');
  }
  return value;
}

export function validateProductFallbackIcon(
  value: DatabaseProductFallbackIcon,
): DatabaseProductFallbackIcon {
  if (!FALLBACK_ICONS.has(value)) {
    throw new Error('O ícone escolhido não é válido.');
  }
  return value;
}

export function getProductPresentation(
  database: DatabaseContext,
  productId: string,
): DatabaseProductPresentation {
  const rawIcon = readMeta(database, iconKey(productId));
  const fallbackIcon = FALLBACK_ICONS.has(rawIcon as DatabaseProductFallbackIcon)
    ? (rawIcon as DatabaseProductFallbackIcon)
    : 'package';
  return {
    imageDataUrl: readMeta(database, imageKey(productId)),
    fallbackIcon,
  };
}

export function setProductPresentation(
  database: DatabaseContext,
  productId: string,
  input: {
    readonly imageDataUrl: string | null;
    readonly fallbackIcon: DatabaseProductFallbackIcon;
  },
): DatabaseProductPresentation {
  const imageDataUrl = validateProductImageDataUrl(input.imageDataUrl);
  const fallbackIcon = validateProductFallbackIcon(input.fallbackIcon);
  if (imageDataUrl === null) {
    database.sqlite.prepare('DELETE FROM app_meta WHERE key = ?').run(imageKey(productId));
  } else {
    writeMeta(database, imageKey(productId), imageDataUrl);
  }
  writeMeta(database, iconKey(productId), fallbackIcon);
  return { imageDataUrl, fallbackIcon };
}

export function clearProductPresentation(database: DatabaseContext, productId: string): void {
  database.sqlite
    .prepare('DELETE FROM app_meta WHERE key IN (?, ?)')
    .run(imageKey(productId), iconKey(productId));
}
