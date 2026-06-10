import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useBottomTabBarHeight} from '@react-navigation/bottom-tabs';
import {ArrowLeft} from 'lucide-react-native';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {EmptyState, Loader} from '@app/components/ui';
import {HOME_ROUTES, TAB_ROUTES} from '@app/constants/routes';
import {NotificationItemRow} from '@app/features/notifications/components/NotificationItemRow';
import {NotificationsEmptyState} from '@app/features/notifications/components/NotificationsEmptyState';
import type {
  NotificationDestination,
  ProductNotification,
} from '@app/features/notifications/types';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {useNotificationsOverview} from '@app/hooks/useNotificationsOverview';
import type {HomeStackParamList} from '@app/types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'Notifications'>;

export function NotificationsScreen({navigation}: Props) {
  const {theme} = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const notificationsOverview = useNotificationsOverview();

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: tabBarHeight + theme.spacing.md,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 22,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.5,
    },
    summaryCard: {
      borderRadius: 26,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
      gap: 4,
    },
    summaryValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 30,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.8,
    },
    summaryText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
    list: {
      gap: 10,
    },
  });

  const openDestination = (destination: NotificationDestination) => {
    if (destination === 'workouts') {
      navigation.getParent()?.navigate(TAB_ROUTES.Workouts as never);
      return;
    }

    if (destination === 'challenge') {
      navigation.navigate(HOME_ROUTES.Challenge);
      return;
    }

    if (destination === 'hydration') {
      navigation.navigate(HOME_ROUTES.Home);
      return;
    }

    if (destination === 'nutrition') {
      navigation.navigate(HOME_ROUTES.NutritionPlan);
      return;
    }

    if (destination === 'ellie') {
      navigation.getParent()?.navigate(TAB_ROUTES.Ellie as never);
      return;
    }

    if (destination === 'progress') {
      navigation.getParent()?.navigate(TAB_ROUTES.Progress as never);
      return;
    }

    if (destination === 'quiz') {
      navigation.navigate(HOME_ROUTES.QuizLanding);
      return;
    }

    navigation.navigate(HOME_ROUTES.PersonalRecords);
  };

  const handleNotificationPress = (notification: ProductNotification) => {
    if (notification.sourceAction === 'log_nutrition') {
      navigation.navigate(HOME_ROUTES.NutritionPlan, {openLog: true});
      return;
    }

    openDestination(notification.destination);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={({pressed}) => [styles.backButton, pressed ? {opacity: 0.86} : null]}>
        <ArrowLeft color={theme.colors.textPrimary} size={18} strokeWidth={2.1} />
      </Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>Centro de acción</Text>
        <Text style={styles.title}>Notificaciones</Text>
      </View>
    </View>
  );

  if (notificationsOverview.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          {renderHeader()}
          <Loader label="Cargando notificaciones..." />
        </View>
      </SafeAreaView>
    );
  }

  if (notificationsOverview.error) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          {renderHeader()}
          <EmptyState
            title="No pudimos cargar tus notificaciones"
            description="ELLIE necesita revisar tu estado actual. Vuelve a intentarlo en unos minutos."
          />
        </View>
      </SafeAreaView>
    );
  }

  const notifications = notificationsOverview.notifications;
  const pendingCount = notificationsOverview.unreadCount;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {renderHeader()}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
          <Text style={styles.summaryText}>
            {pendingCount === 1
              ? 'acción pendiente derivada de tu estado actual.'
              : 'acciones pendientes derivadas de tu estado actual.'}
          </Text>
        </View>

        {notifications.length > 0 ? (
          <View style={styles.list}>
            {notifications.map(notification => (
              <NotificationItemRow
                key={notification.id}
                notification={notification}
                onPress={() => handleNotificationPress(notification)}
              />
            ))}
          </View>
        ) : (
          <NotificationsEmptyState />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
