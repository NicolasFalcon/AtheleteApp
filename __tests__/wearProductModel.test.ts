import type { WearProduct } from '../src/features/wear/wearCatalog';
import {
  isFullySoldOut,
  toggleSize,
  wearProductState,
} from '../src/features/wear/wearProductModel';

const base: WearProduct = {
  id: 'p',
  name: 'Camiseta',
  category: 'Parte superior',
  price: '35 €',
  photo: 0,
  description: '',
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
  soldOut: ['XL'],
  facts: [],
};

describe('Wear product · sin talla elegida', () => {
  const state = wearProductState(base, null, false);

  it('asks for a size and the CTA is inactive', () => {
    expect(state.size).toBeNull();
    expect(state.cta).toEqual({ kind: 'pickSize', label: 'Elige tu talla', enabled: false });
    expect(state.sizeLine).toBe('XL agotada');
  });

  it('says every size is available when none is sold out', () => {
    expect(wearProductState({ ...base, soldOut: [] }, null, false).sizeLine).toBe(
      'Todas disponibles',
    );
  });

  it('pluralises several sold-out sizes', () => {
    expect(
      wearProductState({ ...base, soldOut: ['S', 'M'] }, null, false).sizeLine,
    ).toBe('S, M agotadas');
  });
});

describe('Wear product · con talla elegida', () => {
  it('shows the size and, with the store closed, "Próximamente" (no purchase)', () => {
    const state = wearProductState(base, 'M', false);
    expect(state.size).toBe('M');
    expect(state.sizeLine).toBe('Talla M · disponible');
    expect(state.cta.kind).toBe('storeSoon');
    expect(state.cta.label).toBe('Próximamente');
    expect(state.cta.enabled).toBe(false);
    expect(state.sizes.find(size => size.label === 'M')?.selected).toBe(true);
  });

  it('offers the external purchase only when the store is open', () => {
    const state = wearProductState(base, 'M', true);
    expect(state.cta).toEqual({
      kind: 'buy',
      label: 'Comprar en ATHELETE Wear',
      enabled: true,
    });
  });

  it('selects, clears and replaces a size', () => {
    expect(toggleSize(base, null, 'M')).toBe('M');
    expect(toggleSize(base, 'M', 'M')).toBeNull();
    expect(toggleSize(base, 'M', 'L')).toBe('L');
  });

  it('ignores a chosen size that is not valid', () => {
    expect(wearProductState(base, 'XXL', false).size).toBeNull();
  });

  it('preselects a single size', () => {
    const single = { ...base, sizes: ['Única'], soldOut: [] };
    const state = wearProductState(single, null, false);
    expect(state.size).toBe('Única');
    expect(state.sizeLine).toBe('Talla única');
    expect(toggleSize(single, null, 'Única')).toBe('Única');
  });
});

describe('Wear product · agotada', () => {
  it('does not let a sold-out size be chosen', () => {
    expect(toggleSize(base, 'M', 'XL')).toBe('M');
    expect(toggleSize(base, null, 'XL')).toBeNull();
    const state = wearProductState(base, 'XL', false);
    expect(state.size).toBeNull();
    const xl = state.sizes.find(size => size.label === 'XL');
    expect(xl).toMatchObject({ soldOut: true, disabled: true, selected: false });
  });

  it('marks a product with every size sold out', () => {
    const none = { ...base, soldOut: [...base.sizes] };
    expect(isFullySoldOut(none)).toBe(true);
    const state = wearProductState(none, null, false);
    expect(state.cta).toEqual({ kind: 'soldOut', label: 'Agotado', enabled: false });
  });
});

describe('Wear product · próximamente', () => {
  const soon = { ...base, soon: { when: 'Llega en noviembre.' } };
  const state = wearProductState(soon, 'M', true);

  it('has no size to choose and an inactive CTA with the date', () => {
    expect(state.size).toBeNull();
    expect(state.sizeLine).toBe('Tallas previstas');
    expect(state.cta).toEqual({ kind: 'soon', label: 'Próximamente', enabled: false });
    expect(state.footNote).toBe('Llega en noviembre.');
    expect(state.sizes.every(size => size.disabled)).toBe(true);
  });

  it('ignores presses on its sizes', () => {
    expect(toggleSize(soon, null, 'M')).toBeNull();
  });

  it('is never "sold out"', () => {
    expect(isFullySoldOut({ ...soon, soldOut: [...soon.sizes] })).toBe(false);
  });
});
