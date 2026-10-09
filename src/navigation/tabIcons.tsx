import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Own tab icons (handoff v2.12, `icons/tab-*.svg`): 24 pt viewBox, 1.6 stroke.
// Exception to D-32 (Lucide everywhere else). Inactive = outline in `color`;
// active (`-on`) = Ember stroke with the soft Ember fill the handoff draws.
export type TabIconName = 'home' | 'workouts' | 'progress' | 'community';

type TabIconProps = {
  name: TabIconName;
  active: boolean;
  color: string; // stroke when inactive
  ember: string; // stroke when active
  size?: number;
};

const FILL = 'rgba(255,91,31,.16)';

export function TabIcon({ name, active, color, ember, size = 24 }: TabIconProps) {
  const stroke = active ? ember : color;
  const fill = active ? FILL : 'none';
  const common = {
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'home' ? (
        <>
          <Path
            d="M5.5 9.4v9.8c0 .5.4.8.8.8H10v-4.6a2 2 0 0 1 4 0V20h3.7c.4 0 .8-.3.8-.8V9.4"
            fill={fill}
            {...common}
          />
          <Path d="M3.5 10.6 12 4l8.5 6.6" {...common} />
        </>
      ) : null}
      {name === 'workouts' ? (
        <>
          <Rect x={4.6} y={6.6} width={3.4} height={10.8} rx={1.7} fill={fill} {...common} />
          <Rect x={16} y={6.6} width={3.4} height={10.8} rx={1.7} fill={fill} {...common} />
          <Path d="M8 12h8M2.4 10v4M21.6 10v4" {...common} />
        </>
      ) : null}
      {name === 'progress' ? (
        <>
          <Path
            d="M3 18.5c3.6 0 4.6-6.5 8.2-6.5 3 0 3.4 2.6 6 .6 1.4-1.1 2-3.4 2.5-5.4"
            {...common}
          />
          <Circle cx={19.7} cy={6.6} r={2} fill={active ? ember : 'none'} {...common} />
          <Path d="M3 21h18" strokeOpacity={0.35} {...common} />
        </>
      ) : null}
      {name === 'community' ? (
        <>
          <Circle cx={9} cy={8.6} r={3.3} fill={fill} {...common} />
          <Circle cx={16.8} cy={9.6} r={2.6} {...common} />
          <Path d="M3.4 19.4c.6-3.1 2.8-5 5.6-5s5 1.9 5.6 5" {...common} />
          <Path d="M15.6 14.4c2.6-.2 4.5 1.4 5.1 4.2" {...common} />
        </>
      ) : null}
    </Svg>
  );
}
