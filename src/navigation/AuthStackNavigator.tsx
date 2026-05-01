import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AUTH_ROUTES } from '@app/constants/routes';
import { ForgotPasswordScreen } from '@app/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '@app/screens/auth/LoginScreen';
import { RegisterScreen } from '@app/screens/auth/RegisterScreen';
import type { AuthStackParamList } from '@app/types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name={AUTH_ROUTES.Login} component={LoginScreen} />
      <Stack.Screen name={AUTH_ROUTES.Register} component={RegisterScreen} />
      <Stack.Screen
        name={AUTH_ROUTES.ForgotPassword}
        component={ForgotPasswordScreen}
      />
    </Stack.Navigator>
  );
}
