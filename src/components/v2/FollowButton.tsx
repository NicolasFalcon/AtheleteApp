import type { StyleProp, ViewStyle } from 'react-native';
import { Button } from '@app/components/v2/Button';
import { useToast } from '@app/components/v2/Toast';
import { setFollowing, useFollowing } from '@app/features/social/communityStore';
import { useSocialService } from '@app/features/social/useSocial';

// "Seguir" / "Siguiendo" (follow_user / unfollow_user). Optimistic: every card
// of that author and the profile change at once, and go back if it fails.
export function FollowButton({
  userId,
  name,
  following: server,
  size = 'sm',
  withTabBar = false,
  style,
}: {
  userId: string;
  name: string;
  following: boolean;
  size?: 'sm' | 'md';
  withTabBar?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const toast = useToast();
  const service = useSocialService();
  const following = useFollowing(userId, server);

  const toggle = async () => {
    const next = !following;
    setFollowing(userId, next);
    try {
      const result = next ? await service.followUser(userId) : await service.unfollowUser(userId);
      setFollowing(userId, result);
    } catch {
      setFollowing(userId, !next);
      toast.show(next ? 'No se pudo seguir. Inténtalo de nuevo.' : 'No se pudo dejar de seguir.', {
        tone: 'error',
        withTabBar,
      });
    }
  };

  return (
    <Button
      label={following ? 'Siguiendo' : 'Seguir'}
      variant={following ? 'secondary' : 'primary'}
      size={size}
      haptic
      accessibilityLabel={following ? `Dejar de seguir a ${name}` : `Seguir a ${name}`}
      onPress={toggle}
      style={style}
    />
  );
}
