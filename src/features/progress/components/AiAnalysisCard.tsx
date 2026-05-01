import {Sparkles} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type AiAnalysisCardProps = {
  insights: string[];
};

export function AiAnalysisCard({insights}: AiAnalysisCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: 24,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.3,
    },
    list: {
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    bullet: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 1,
    },
    text: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 22,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Sparkles color={theme.colors.textPrimary} size={16} strokeWidth={2} />
        <Text style={styles.title}>Análisis IA</Text>
      </View>
      <View style={styles.list}>
        {insights.map(insight => (
          <View key={insight} style={styles.row}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.text}>{insight}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
