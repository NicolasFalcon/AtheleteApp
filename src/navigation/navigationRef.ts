import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@app/types/navigation';

// Root container ref, for code that lives outside the navigators.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
