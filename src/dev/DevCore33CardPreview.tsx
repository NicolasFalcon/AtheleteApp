import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { IconButton, TextV2, useThemeV2 } from '@app/components/v2';
import { Core33InviteCard } from '@app/features/home/v2/Core33InviteCard';
import { ThemeV2ModeScope } from '@app/providers/ThemeProvider';

// Development-only preview of the Core 33 discovery card (HOME_10 / HOME_11)
// in Light and Dark. athelete://dev/core33-card[?mode=dark] (Dark first). Buttons do nothing.
export function DevCore33CardPreview({
  onClose,
  darkFirst = false,
}: {
  onClose: () => void;
  darkFirst?: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8 }}>
        {(darkFirst
          ? (['dark', 'light'] as const)
          : (['light', 'dark'] as const)
        ).map(mode => (
          <ThemeV2ModeScope key={mode} mode={mode}>
            <Panel title={mode === 'light' ? 'Light' : 'Dark'} />
          </ThemeV2ModeScope>
        ))}
      </ScrollView>
      <View style={[styles.close, { top: insets.top + 4 }]}>
        <IconButton
          icon={X}
          size={36}
          accessibilityLabel="Cerrar"
          onPress={onClose}
        />
      </View>
    </View>
  );
}

function Panel({ title }: { title: string }) {
  const { colors } = useThemeV2();
  const noop = () => {};

  return (
    <View style={[styles.panel, { backgroundColor: colors.bg }]}>
      <TextV2 variant="eyebrow" tone="secondary">
        {title}
      </TextV2>
      <Core33InviteCard
        variant="invite"
        completedCount={0}
        onPress={noop}
        onDismiss={noop}
      />
      <Core33InviteCard
        variant="again"
        completedCount={1}
        onPress={noop}
        onDismiss={noop}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#000',
  },
  panel: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  close: {
    position: 'absolute',
    right: 16,
  },
});
