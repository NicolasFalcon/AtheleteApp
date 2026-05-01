import {ArrowLeft} from 'lucide-react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button, EmptyState} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {WorkoutsStackParamList} from '@app/types/navigation';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'CreateRoutine'>;

export function CreateRoutineScreen({navigation}: Props) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={18} strokeWidth={2.2} />
        </Pressable>
        <EmptyState
          title="Crear rutina"
          description="La creación completa de rutinas será la siguiente fase. Dejamos esta entrada conectada para que el flujo de Entrenos no tenga acciones muertas."
        />
        <Button label="Volver a Entrenos" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}
