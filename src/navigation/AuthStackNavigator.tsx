import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AUTH_ROUTES } from '@app/constants/routes';
import { ForgotPasswordScreen } from '@app/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '@app/screens/auth/LoginScreen';
import { RegisterScreen } from '@app/screens/auth/RegisterScreen';
import { ResetPasswordScreen } from '@app/screens/auth/ResetPasswordScreen';
import { useAuth } from '@app/hooks/useAuth';
import type { AuthStackParamList } from '@app/types/navigation';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStackNavigator() {
  const {isPasswordRecoveryActive} = useAuth();

  return (
    <Stack.Navigator
      initialRouteName={
        isPasswordRecoveryActive
          ? AUTH_ROUTES.ResetPassword
          : AUTH_ROUTES.Login
      }
      key={isPasswordRecoveryActive ? 'password-recovery' : 'auth'}
      screenOptions={{headerShown: false}}>
      <Stack.Screen name={AUTH_ROUTES.Login} component={LoginScreen} />
      <Stack.Screen name={AUTH_ROUTES.Register} component={RegisterScreen} />
      <Stack.Screen
        name={AUTH_ROUTES.ForgotPassword}
        component={ForgotPasswordScreen}
      />
      <Stack.Screen
        name={AUTH_ROUTES.ResetPassword}
        component={ResetPasswordScreen}
      />
    </Stack.Navigator>
  );
}
