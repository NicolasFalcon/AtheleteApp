import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ELLIE_ROUTES} from '@app/constants/routes';
import {NutritionPlanScreen} from '@app/screens/nutrition/NutritionPlanScreen';
import {EllieScreen} from '@app/screens/tabs/EllieScreen';
import type {EllieStackParamList} from '@app/types/navigation';

const Stack = createNativeStackNavigator<EllieStackParamList>();

export function EllieStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name={ELLIE_ROUTES.Ellie} component={EllieScreen} />
      <Stack.Screen
        name={ELLIE_ROUTES.NutritionPlan}
        component={NutritionPlanScreen}
      />
    </Stack.Navigator>
  );
}
