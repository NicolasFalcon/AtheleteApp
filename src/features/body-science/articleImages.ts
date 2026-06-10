import type {ImageSourcePropType} from 'react-native';
import {
  bodyScienceHeroTraining,
  bodyScienceThumbMindset,
  bodyScienceThumbNutrition,
  bodyScienceThumbRecovery,
  bodyScienceThumbTraining,
} from '@app/assets/images';

export function getBodyScienceArticleImage(
  category: string,
  hero = false,
): ImageSourcePropType {
  if (hero) {
    return bodyScienceHeroTraining;
  }

  if (category === 'Recovery') {
    return bodyScienceThumbRecovery;
  }

  if (category === 'Nutrition') {
    return bodyScienceThumbNutrition;
  }

  if (category === 'Mindset') {
    return bodyScienceThumbMindset;
  }

  return bodyScienceThumbTraining;
}
