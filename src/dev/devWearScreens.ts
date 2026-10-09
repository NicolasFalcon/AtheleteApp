import { StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';

// Development only: ATHELETE Wear screens and product states (sample catalog,
// nothing is read or written). athelete://dev/wear?screen=<key>
export const WEAR_DEV_SCREENS = [
  { key: 'collection', label: 'Colección (WEAR_01)' },
  { key: 'productNoSize', label: 'Producto · sin talla (WEAR_02)', productId: 'camiseta' },
  { key: 'productSize', label: 'Producto · con talla', productId: 'camiseta', devSize: 'M' },
  { key: 'productSoldOutSize', label: 'Producto · una talla agotada', productId: 'sudadera' },
  { key: 'sizesNone', label: 'Producto · tallas, ninguna elegida', productId: 'camiseta', devScroll: 420 },
  { key: 'sizesChosen', label: 'Producto · tallas, M elegida', productId: 'camiseta', devSize: 'M', devScroll: 420 },
  { key: 'sizesSoldOut', label: 'Producto · tallas, una agotada', productId: 'sudadera', devScroll: 420 },
  { key: 'sizesSoon', label: 'Producto · tallas, próximamente', productId: 'leggings', devScroll: 420 },
  { key: 'productSoon', label: 'Producto · Próximamente (WEAR_03)', productId: 'leggings' },
  { key: 'productSingle', label: 'Producto · talla única, próximamente', productId: 'botella' },
] as const;

export type WearDevScreen = (typeof WEAR_DEV_SCREENS)[number]['key'];

export function isWearDevScreen(value: string | null): value is WearDevScreen {
  return WEAR_DEV_SCREENS.some(screen => screen.key === value);
}

export async function openWearDevScreen(key: WearDevScreen): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const entry = WEAR_DEV_SCREENS.find(screen => screen.key === key);
  if (!entry) {
    return false;
  }
  if ((navigationRef.getRootState()?.routes.length ?? 0) > 1) {
    navigationRef.dispatch(StackActions.popToTop());
  }
  if (entry.key === 'collection') {
    navigationRef.dispatch(StackActions.push('WearCollection' as never));
    return true;
  }
  const params = {
    productId: 'productId' in entry ? entry.productId : 'camiseta',
    devSize: 'devSize' in entry ? entry.devSize : undefined,
    devScroll: 'devScroll' in entry ? entry.devScroll : undefined,
  };
  navigationRef.dispatch(StackActions.push('WearProduct' as never, params as never));
  return true;
}
