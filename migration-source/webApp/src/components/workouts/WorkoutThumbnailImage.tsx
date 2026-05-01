import type { ImgHTMLAttributes } from 'react';
import { useEffect, useState } from 'react';
import { resolveWorkoutThumbnailSrc, DEFAULT_WORKOUT_THUMBNAIL } from '@/lib/workoutThumbnails';

interface WorkoutThumbnailImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  title: string;
  type?: string;
  targetMuscles?: string[];
}

export function WorkoutThumbnailImage({
  src,
  title,
  type,
  targetMuscles,
  alt,
  ...props
}: WorkoutThumbnailImageProps) {
  const resolvedSrc = resolveWorkoutThumbnailSrc({
    src,
    type,
    targetMuscles,
    title,
  });
  const [currentSrc, setCurrentSrc] = useState(resolvedSrc);

  useEffect(() => {
    setCurrentSrc(resolvedSrc);
  }, [resolvedSrc]);

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt ?? title}
      onError={() => {
        if (currentSrc !== DEFAULT_WORKOUT_THUMBNAIL) {
          setCurrentSrc(DEFAULT_WORKOUT_THUMBNAIL);
        }
      }}
    />
  );
}
