import {ImageBackground, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {ArrowRight, X} from 'lucide-react-native';
import {atheleteWearEditorial} from '@app/assets/images';
import {Button} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type WearPreviewModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function WearPreviewModal({visible, onClose}: WearPreviewModalProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(17,17,17,0.54)',
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    card: {
      borderRadius: theme.radii.xl,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
    },
    hero: {
      minHeight: 220,
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.56)',
    },
    closeButton: {
      alignSelf: 'flex-end',
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      color: 'rgba(255,255,255,0.78)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 1.4,
    },
    title: {
      marginTop: theme.spacing.sm,
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.8,
    },
    subtitle: {
      marginTop: theme.spacing.xs,
      color: 'rgba(255,255,255,0.78)',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 22,
    },
    body: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 24,
    },
  });

  return (
    <Modal
      animationType="fade"
      visible={visible}
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ImageBackground source={atheleteWearEditorial} style={styles.hero}>
            <View style={styles.heroOverlay} />
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color="#FFFFFF" size={18} strokeWidth={2.2} />
            </Pressable>
            <View>
              <Text style={styles.eyebrow}>ATHELETE WEAR</Text>
              <Text style={styles.title}>Colección en preparación</Text>
              <Text style={styles.subtitle}>
                La línea oficial está en camino con piezas diseñadas para entrenar
                con carácter y durar más.
              </Text>
            </View>
          </ImageBackground>

          <View style={styles.body}>
            <Text style={styles.description}>
              Pronto podrás explorar tops, bottoms y accesorios dentro de la app.
            </Text>
            <Button
              label="Entendido"
              onPress={onClose}
              accessoryRight={<ArrowRight color={theme.colors.accentContrast} size={16} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
