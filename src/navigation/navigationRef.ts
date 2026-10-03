import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@app/types/navigation';

// Root container ref. Used by development tools (deep links to screens) that
// live outside the navigators.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
