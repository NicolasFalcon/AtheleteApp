import {Droplets} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type NutritionGuidelinesCardProps = {
  guidelines: string[];
};

export function NutritionGuidelinesCard({
  guidelines,
}: NutritionGuidelinesCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 18,
      borderRadius: 26,
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.bold,
    },
    list: {
      gap: 10,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    icon: {
      marginTop: 1,
    },
    text: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
  });

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Guías generales</Text>
      <View style={styles.list}>
        {guidelines.map(item => (
          <View key={item} style={styles.item}>
            <Droplets
              color={theme.colors.accent}
              size={14}
              strokeWidth={2.1}
              style={styles.icon}
            />
            <Text style={styles.text}>{item}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
