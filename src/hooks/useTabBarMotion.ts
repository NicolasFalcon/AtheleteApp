import { useContext } from 'react';
import { TabBarMotionContext } from '@app/providers/TabBarMotionProvider';

export function useTabBarMotion() {
  const context = useContext(TabBarMotionContext);

  if (!context) {
    throw new Error(
      'useTabBarMotion must be used within TabBarMotionProvider.',
    );
  }

  return context;
}
