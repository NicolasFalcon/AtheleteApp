import type { WearProduct } from '@app/features/wear/wearCatalog';

// State logic of the Wear product page (handoff §"Producto" and Size
// Selector, Wear.dc.html). Pure: no purchase, no network.

export type WearCtaKind =
  | 'pickSize' // no size chosen: "Elige tu talla"
  | 'storeSoon' // size chosen, but the store is not open: "Próximamente"
  | 'buy' // size chosen and the store is open: "Comprar en ATHELETE Wear"
  | 'soon' // product not on sale yet: "Próximamente" + date
  | 'soldOut'; // every size sold out

export type WearSizeState = {
  label: string;
  selected: boolean;
  soldOut: boolean;
  // Sold-out sizes and every size of an upcoming product cannot be chosen.
  disabled: boolean;
};

export type WearProductState = {
  // The size that counts as chosen (a single size is preselected).
  size: string | null;
  sizes: WearSizeState[];
  sizeLine: string;
  cta: { kind: WearCtaKind; label: string; enabled: boolean };
  footNote: string;
};

export const STORE_SOON_NOTE = 'La tienda online de ATHELETE Wear abre pronto.';
const BUY_NOTE =
  'Se abre la tienda online de ATHELETE Wear. El pago se completa allí.';

export function isSingleSize(product: Pick<WearProduct, 'sizes'>): boolean {
  return product.sizes.length === 1;
}

export function isFullySoldOut(
  product: Pick<WearProduct, 'sizes' | 'soldOut' | 'soon'>,
): boolean {
  return (
    !product.soon &&
    product.sizes.length > 0 &&
    product.sizes.every(size => product.soldOut.includes(size))
  );
}

// Pressing a size: ignored when it is sold out or the product is upcoming;
// pressing the chosen size again clears it.
export function toggleSize(
  product: Pick<WearProduct, 'sizes' | 'soldOut' | 'soon'>,
  current: string | null,
  pressed: string,
): string | null {
  if (product.soon || product.soldOut.includes(pressed)) {
    return current;
  }
  if (isSingleSize(product)) {
    return product.sizes[0];
  }
  return current === pressed ? null : pressed;
}

function soldOutLine(soldOut: readonly string[]): string {
  return `${soldOut.join(', ')} ${soldOut.length > 1 ? 'agotadas' : 'agotada'}`;
}

export function wearProductState(
  product: WearProduct,
  chosen: string | null,
  storeOpen: boolean,
): WearProductState {
  const single = isSingleSize(product);
  const upcoming = Boolean(product.soon);
  const size = upcoming
    ? null
    : single
    ? product.sizes[0]
    : chosen && product.sizes.includes(chosen) && !product.soldOut.includes(chosen)
    ? chosen
    : null;

  const sizes: WearSizeState[] = product.sizes.map(label => {
    const soldOut = product.soldOut.includes(label);
    return {
      label,
      selected: size === label,
      soldOut,
      disabled: soldOut || upcoming,
    };
  });

  const sizeLine = upcoming
    ? 'Tallas previstas'
    : single
    ? 'Talla única'
    : size
    ? `Talla ${size} · disponible`
    : product.soldOut.length > 0
    ? soldOutLine(product.soldOut)
    : 'Todas disponibles';

  if (upcoming) {
    return {
      size,
      sizes,
      sizeLine,
      cta: { kind: 'soon', label: 'Próximamente', enabled: false },
      footNote: product.soon?.when ?? '',
    };
  }
  if (isFullySoldOut(product)) {
    return {
      size,
      sizes,
      sizeLine: 'Agotado',
      cta: { kind: 'soldOut', label: 'Agotado', enabled: false },
      footNote: 'Sin existencias por ahora.',
    };
  }
  if (!size) {
    return {
      size,
      sizes,
      sizeLine,
      cta: { kind: 'pickSize', label: 'Elige tu talla', enabled: false },
      footNote: storeOpen ? BUY_NOTE : STORE_SOON_NOTE,
    };
  }
  return storeOpen
    ? {
        size,
        sizes,
        sizeLine,
        cta: { kind: 'buy', label: 'Comprar en ATHELETE Wear', enabled: true },
        footNote: BUY_NOTE,
      }
    : {
        size,
        sizes,
        sizeLine,
        cta: { kind: 'storeSoon', label: 'Próximamente', enabled: false },
        footNote: STORE_SOON_NOTE,
      };
}
