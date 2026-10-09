import { useState, type ReactNode } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Award,
  Bell,
  Dumbbell,
  Flame,
  Plus,
  Settings,
  Trophy,
  X,
} from 'lucide-react-native';
import {
  BackButton,
  Button,
  LivingHalo,
  EllieSurface,
  Eyebrow,
  GlassHeader,
  HealthTag,
  HexMedal,
  IconButton,
  MetricTrio,
  Rings,
  Row,
  Scrim,
  SectionHeader,
  Segmented,
  Sheet,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  SwitchV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { SceneScope, ThemeV2ModeScope } from '@app/providers/ThemeProvider';

type PreviewMode = 'light' | 'dark' | 'scene';

// Package photo with the prototype hero treatment baked in
// (saturate .4, contrast 1.08, brightness .7). PLACEHOLDER photography.
const PHOTO = require('@app/assets/v2/photos/esfuerzo.jpg');

function Section({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { layout } = useThemeV2();

  return (
    <View style={[styles.section, { marginBottom: layout.sectionGap }, style]}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </View>
  );
}

function CatalogContent({ onClose }: { onClose: () => void }) {
  const theme = useThemeV2();
  const { colors, scene, layout } = theme;
  const toast = useToast();
  const [segment, setSegment] = useState<'feed' | 'retos' | 'amigos'>('feed');
  const [range, setRange] = useState<'semana' | 'mes'>('semana');
  const [notifications, setNotifications] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <>
      <Section title="Tipografía">
        <TextV2 variant="displayM">74</TextV2>
        <TextV2 variant="title28">Comunidad</TextV2>
        <TextV2 variant="section">Tu día</TextV2>
        <TextV2 variant="body">
          Texto de trabajo a 15 pt · 75,2 kg · 6.420 pasos
        </TextV2>
        <TextV2 variant="meta" tone="secondary">
          Metadatos a 13 pt en color secundario
        </TextV2>
        <TextV2 variant="bodyStrong" tone="ember">
          +5 kg sobre tu marca
        </TextV2>
      </Section>

      <Section title="CTA">
        <Button label="Empezar entreno" onPress={() => undefined} />
        <Button
          label="Guardar"
          loading={loading}
          loadingLabel="Guardando…"
          success={saved}
          successLabel="Agregado a Full body del viernes"
          onPress={() => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              setSaved(true);
            }, 900);
          }}
        />
        <Button label="Guardar" disabled onPress={() => undefined} />
        <Button
          variant="commit"
          label="Comenzar Día 1"
          onPress={() => undefined}
        />
        <View style={styles.inline}>
          <Button
            variant="secondary"
            label="Compartir"
            onPress={() => undefined}
          />
          <Button
            variant="outline"
            label="Ver todo"
            onPress={() => undefined}
          />
          <Button variant="text" label="Ahora no" onPress={() => undefined} />
        </View>
        <Button
          variant="outline"
          size="sm"
          icon={Plus}
          iconPosition="start"
          label="Registrar"
          onPress={() => undefined}
        />
      </Section>

      <Section title="Botones de icono">
        <View style={styles.inline}>
          <BackButton onPress={() => undefined} />
          <IconButton
            icon={Bell}
            badge
            accessibilityLabel="Notificaciones"
            onPress={() => undefined}
          />
          <IconButton
            icon={Plus}
            variant="solid"
            accessibilityLabel="Publicar"
            onPress={() => undefined}
          />
          <IconButton
            icon={X}
            size={36}
            accessibilityLabel="Cerrar"
            onPress={() => undefined}
          />
          <IconButton
            icon={Settings}
            disabled
            accessibilityLabel="Ajustes"
            onPress={() => undefined}
          />
        </View>
      </Section>

      <Section title="Segmented">
        <Segmented
          options={[
            { key: 'feed', label: 'Feed' },
            { key: 'retos', label: 'Retos', badge: 2 },
            { key: 'amigos', label: 'Amigos' },
          ]}
          value={segment}
          onChange={setSegment}
        />
        <Segmented
          size="compact"
          options={[
            { key: 'semana', label: 'Semana' },
            { key: 'mes', label: 'Mes' },
          ]}
          value={range}
          onChange={setRange}
          style={styles.compact}
        />
      </Section>

      <Section title="Section header y filas">
        <SectionHeader
          title="Para entrenar esta semana"
          action={{ label: 'Todo', onPress: () => undefined }}
        />
        <SectionHeader variant="eyebrow" title="Tu mejor marca" />
        <View>
          <Row
            title="Apple Health"
            value="Sin conectar"
            trailing="chevron"
            onPress={() => undefined}
          />
          <Row
            title="Notificaciones"
            subtitle="Recordatorios de entreno y de Core 33"
            trailing={
              <SwitchV2
                value={notifications}
                onValueChange={setNotifications}
                accessibilityLabel="Notificaciones"
              />
            }
          />
          <Row
            title="Cerrar sesión"
            destructive
            divider={false}
            onPress={() => undefined}
          />
        </View>
      </Section>

      <Section title="Métricas y Salud">
        <MetricTrio
          items={[
            { value: '42', unit: 'min', label: 'Duración' },
            { value: '6', label: 'Ejercicios' },
            {
              value: '412',
              unit: 'kcal',
              label: 'kcal activas',
              source: 'health',
            },
          ]}
        />
        <View style={styles.inline}>
          <TextV2 variant="body">75,2 kg</TextV2>
          <HealthTag />
        </View>
      </Section>

      <Section title="Anillos y medallas">
        <View style={styles.inline}>
          <Rings
            rings={[
              { progress: 0.66, color: colors.ember.base },
              { progress: 0.44, color: colors.ember.base, opacity: 0.6 },
              { progress: 0.43, color: colors.recovery.base },
            ]}
          />
          <View style={styles.medals}>
            <HexMedal icon={Trophy} accessibilityLabel="Primer entreno" />
            <HexMedal
              icon={Flame}
              state="locked"
              progress={0.6}
              accessibilityLabel="Racha de 7 días"
            />
            <HexMedal icon={Award} size={84} accessibilityLabel="Core 33" />
          </View>
        </View>
      </Section>

      <Section title="ELLIE">
        <View style={styles.inline}>
          <LivingHalo size={72} />
          <LivingHalo size={48} state="thinking" />
          <LivingHalo size={48} state="offline" />
        </View>
      </Section>
      <EllieSurface
        style={[
          styles.bleed,
          { marginHorizontal: -layout.gutter, marginBottom: layout.sectionGap },
        ]}
        message="Ayer descansaste y hoy tienes Total Body pendiente. ¿Lo dejamos en 30 minutos?"
        action={{ label: 'Hablar con ELLIE', onPress: () => undefined }}
      />

      <Section title="Skeleton">
        <SkeletonGroup>
          <View style={styles.skeletonRow}>
            <Skeleton width={40} height={40} radius={20} />
            <View style={styles.skeletonLines}>
              <Skeleton width="60%" height={12} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
          <Skeleton height={180} radius={theme.radius.card} />
        </SkeletonGroup>
      </Section>

      <Section title="Foto con scrim y vidrio">
        <View style={[styles.photo, { borderRadius: theme.radius.card }]}>
          <Image
            source={PHOTO}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <Scrim />
          <View style={styles.photoTop}>
            <IconButton
              icon={X}
              variant="glass"
              accessibilityLabel="Cerrar"
              onPress={() => undefined}
            />
          </View>
          <View style={styles.photoText}>
            <TextV2 variant="eyebrow" color={scene.onDark.meta}>
              Reto de la semana
            </TextV2>
            <TextV2 variant="title28" color={scene.onDark.primary}>
              100 dominadas
            </TextV2>
          </View>
        </View>
        <View
          style={[
            styles.headerPreview,
            { borderRadius: theme.radius.cardCompact },
          ]}
        >
          <GlassHeader
            safeArea={false}
            title="Ajustes"
            left={<BackButton onPress={() => undefined} />}
            right={
              <Button
                variant="text"
                size="md"
                label="Listo"
                onPress={() => undefined}
              />
            }
          />
        </View>
      </Section>

      <Section title="Hoja y toast">
        <Button
          variant="secondary"
          label="Abrir hoja Registrar récord"
          onPress={() => setSheetOpen(true)}
        />
        <Button
          variant="secondary"
          label="Mostrar toast"
          onPress={() => toast.show('Publicado para tus amigos')}
        />
      </Section>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        eyebrow="Peso muerto rumano"
        title="Registrar récord"
        footer={
          <>
            <Button
              variant="secondary"
              label="Cancelar"
              fullWidth={false}
              style={styles.flex1}
              onPress={() => setSheetOpen(false)}
            />
            <Button
              label="Guardar récord"
              fullWidth={false}
              style={styles.flex2}
              onPress={() => setSheetOpen(false)}
            />
          </>
        }
      >
        <Row title="Peso" value="205 kg" />
        <Row title="Repeticiones" value="1" />
        <Row title="Tu mejor marca" value="200 kg" divider={false} />
      </Sheet>

      <Button
        variant="text"
        label="Cerrar catálogo"
        icon={Dumbbell}
        onPress={onClose}
      />
    </>
  );
}

function PreviewBackground({ children }: { children: ReactNode }) {
  const { colors, mode, scene } = useThemeV2();

  return (
    <View
      style={[
        styles.flex1,
        { backgroundColor: mode === 'scene' ? scene.plate : colors.bg },
      ]}
    >
      <StatusBarV2 />
      {children}
    </View>
  );
}

// Development-only catalog of the v2 primitives in Light, Dark and scene.
export function V2CatalogScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<PreviewMode>('light');
  const baseMode = mode === 'scene' ? 'light' : mode;
  const body = (
    <PreviewBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.topBar}>
          <TextV2 variant="title22" style={styles.flex1}>
            Catálogo v2
          </TextV2>
          <IconButton
            icon={X}
            accessibilityLabel="Cerrar catálogo"
            onPress={onClose}
          />
        </View>
        <Segmented
          options={[
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
            { key: 'scene', label: 'Escena' },
          ]}
          value={mode}
          onChange={setMode}
          style={styles.modeSwitch}
        />
        <CatalogContent onClose={onClose} />
      </ScrollView>
    </PreviewBackground>
  );

  return (
    <ThemeV2ModeScope mode={baseMode}>
      {mode === 'scene' ? <SceneScope>{body}</SceneScope> : body}
    </ThemeV2ModeScope>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  content: { paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeSwitch: { marginTop: 16, marginBottom: 32 },
  section: { gap: 12 },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  compact: { alignSelf: 'flex-start', width: 180 },
  medals: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bleed: {},
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  skeletonLines: { flex: 1, gap: 8 },
  photo: { height: 220, overflow: 'hidden', justifyContent: 'space-between' },
  photoTop: { padding: 16, alignItems: 'flex-end' },
  photoText: { padding: 20, gap: 4 },
  headerPreview: { overflow: 'hidden', marginTop: 4 },
});
