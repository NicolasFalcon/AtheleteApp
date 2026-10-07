import { StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { GlassSurface } from '@app/components/v2/GlassSurface';
import { PersonAvatar, type PersonAvatarProps } from '@app/components/v2/PersonAvatar';
import { PressableScale } from '@app/components/v2/PressableScale';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type CommentComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  canSend: boolean;
  sending?: boolean;
  me: Pick<PersonAvatarProps, 'name' | 'avatarKey' | 'profilePhotoUrl'>;
  maxLength: number;
};

// Fixed comment field with glass behind it (SOCIAL_03): your avatar, a white
// pill and a round send button that turns ink when there is text.
export function CommentComposer({
  value,
  onChangeText,
  onSend,
  canSend,
  sending = false,
  me,
  maxLength,
}: CommentComposerProps) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const active = canSend && !sending;

  return (
    <GlassSurface
      kind="nav"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}
    >
      <PersonAvatar relationship="self" size={34} {...me} />
      <View style={[styles.field, { backgroundColor: colors.surface.raised }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Escribe un comentario"
          placeholderTextColor={colors.text.tertiary}
          maxLength={maxLength + 1}
          returnKeyType="send"
          onSubmitEditing={active ? onSend : undefined}
          accessibilityLabel="Escribe un comentario"
          selectionColor={colors.text.primary}
          style={[styles.input, { color: colors.text.primary }]}
        />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Enviar comentario"
          accessibilityState={{ disabled: !active }}
          disabled={!active}
          onPress={onSend}
          style={[
            styles.send,
            {
              backgroundColor: active ? colors.cta.primary : colors.outline.strong,
            },
          ]}
        >
          <Send size={15} strokeWidth={2} color={colors.cta.primaryText} />
        </PressableScale>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  field: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 5,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
