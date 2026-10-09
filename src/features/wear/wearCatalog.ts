import type { ImageSourcePropType } from 'react-native';

// ATHELETE Wear · sample catalog (handoff v2.12; products of Wear.dc.html).
// TODO(wear): placeholder content, no backend. Real products, prices, sizes,
// stock, photos and launch dates come with the online store.
export type WearProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  photo: ImageSourcePropType;
  description: string;
  sizes: readonly string[];
  // Sizes sold out (struck through, not selectable).
  soldOut: readonly string[];
  facts: readonly (readonly [string, string])[];
  // Not on sale yet: no size can be chosen and the CTA says "Próximamente".
  soon?: { when: string };
};

// The store is not open: there is no purchase and no external link yet.
// TODO(wear): true when the online store exists; the CTA becomes "Comprar en
// ATHELETE Wear ↗" (opens the external store, the payment happens there).
export const WEAR_STORE_OPEN = false;

const photo = {
  culturismo: require('@app/assets/v2/photos/wear/culturismo.jpg'),
  piernas: require('@app/assets/v2/photos/wear/piernas.jpg'),
  movilidad: require('@app/assets/v2/photos/wear/movilidad.jpg'),
  barraMujer: require('@app/assets/v2/photos/wear/barra-mujer.jpg'),
  hiit: require('@app/assets/v2/photos/wear/hiit.jpg'),
  mancuernas: require('@app/assets/v2/photos/wear/mancuernas.jpg'),
  overhead: require('@app/assets/v2/photos/wear/overhead.jpg'),
} satisfies Record<string, ImageSourcePropType>;

export const WEAR_PHOTOS = photo;

// Order of the collection: base piece, a two-column grid, the accessory.
export const WEAR_PRODUCTS: readonly WearProduct[] = [
  {
    id: 'camiseta',
    name: 'Camiseta técnica Base',
    category: 'Parte superior',
    price: '35 €',
    photo: photo.culturismo,
    description:
      'Punto técnico ligero que seca rápido. Costuras planas para que nada roce bajo carga.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    soldOut: ['XL'],
    facts: [
      ['Tejido', 'Poliéster reciclado 88 % · elastano 12 %'],
      ['Ajuste', 'Regular'],
      ['Cuidado', 'Lavar a 30 °C del revés'],
    ],
  },
  {
    id: 'short',
    name: 'Short de entrenamiento 5"',
    category: 'Parte inferior',
    price: '42 €',
    photo: photo.piernas,
    description:
      'Cinco pulgadas, cintura elástica plana y bolsillo trasero con cremallera para lo esencial.',
    sizes: ['S', 'M', 'L', 'XL'],
    soldOut: [],
    facts: [
      ['Tejido', 'Tejido ligero con elastano'],
      ['Ajuste', 'Regular · 5"'],
      ['Cuidado', 'Lavar a 30 °C'],
    ],
  },
  {
    id: 'sudadera',
    name: 'Sudadera Recovery',
    category: 'Parte superior',
    price: '68 €',
    photo: photo.movilidad,
    description: 'Felpa gruesa y corte amplio para antes y después de entrenar.',
    sizes: ['S', 'M', 'L', 'XL'],
    soldOut: ['S'],
    facts: [
      ['Tejido', 'Algodón orgánico 100 %'],
      ['Ajuste', 'Amplio'],
      ['Cuidado', 'Lavar a 30 °C del revés'],
    ],
  },
  {
    id: 'top',
    name: 'Top de entrenamiento',
    category: 'Parte superior',
    price: '38 €',
    photo: photo.hiit,
    description: 'Sujeción media, espalda cruzada y tirantes que no se mueven.',
    sizes: ['XS', 'S', 'M', 'L'],
    soldOut: [],
    facts: [
      ['Tejido', 'Poliamida con elastano'],
      ['Sujeción', 'Media'],
      ['Cuidado', 'Lavar a 30 °C'],
    ],
  },
  {
    id: 'leggings',
    name: 'Leggings Base 7/8',
    category: 'Parte inferior',
    price: '55 €',
    photo: photo.barraMujer,
    description:
      'Tiro alto, compresión media y un tejido opaco que no se transparenta en sentadilla.',
    sizes: ['XS', 'S', 'M', 'L'],
    soldOut: [],
    soon: { when: 'Llega en noviembre.' },
    facts: [
      ['Tejido', 'Poliamida 76 % · elastano 24 %'],
      ['Ajuste', 'Ceñido · 7/8'],
      ['Cuidado', 'Lavar a 30 °C'],
    ],
  },
  {
    id: 'botella',
    name: 'Botella térmica 750 ml',
    category: 'Accesorios',
    price: '29 €',
    photo: photo.mancuernas,
    description:
      'Acero de doble pared. Frío durante 24 horas y tapa que se abre con una mano.',
    sizes: ['Única'],
    soldOut: [],
    soon: { when: 'Llega en diciembre.' },
    facts: [
      ['Material', 'Acero inoxidable'],
      ['Capacidad', '750 ml'],
      ['Cuidado', 'Lavar a mano'],
    ],
  },
];

export function findWearProduct(id: string | undefined): WearProduct {
  return WEAR_PRODUCTS.find(product => product.id === id) ?? WEAR_PRODUCTS[0];
}
