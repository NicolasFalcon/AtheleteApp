import { useRef } from 'react';
import { BookOpen, ChevronRight, Clock } from 'lucide-react';
import { BodyScienceArticle } from '@/lib/types';
import { bodyScienceArticles, featuredArticleIds, categoryCaptions, categoryDisplayNames } from '@/lib/bodyScienceData';
import { cn } from '@/lib/utils';

import heroTraining from '@/assets/body-science/hero-training.jpg';
import thumbTraining from '@/assets/body-science/thumb-training.jpg';
import thumbRecovery from '@/assets/body-science/thumb-recovery.jpg';
import thumbNutrition from '@/assets/body-science/thumb-nutrition.jpg';
import thumbMindset from '@/assets/body-science/thumb-mindset.jpg';

const categoryColors: Record<string, string> = {
  Training: 'bg-primary/15 text-primary',
  Recovery: 'bg-info/15 text-info',
  Nutrition: 'bg-foreground/15 text-foreground',
  Mindset: 'bg-accent/15 text-accent-foreground',
};

const categoryThumbnails: Record<string, string> = {
  Training: thumbTraining.src,
  Recovery: thumbRecovery.src,
  Nutrition: thumbNutrition.src,
  Mindset: thumbMindset.src,
};

const CATEGORY_ORDER = ['Training', 'Recovery', 'Nutrition', 'Mindset'] as const;

interface BodyScienceTabProps {
  onSelectArticle: (article: BodyScienceArticle) => void;
}

export function BodyScienceTab({ onSelectArticle }: BodyScienceTabProps) {
  const featuredArticle = bodyScienceArticles.find((a) => a.id === featuredArticleIds[0])!;

  const articlesByCategory = CATEGORY_ORDER.reduce<Record<string, BodyScienceArticle[]>>(
    (acc, cat) => {
      const articles = bodyScienceArticles.filter((a) => a.category === cat);
      if (articles.length > 0) acc[cat] = articles;
      return acc;
    },
    {},
  );

  return (
    <div className="animate-fade-in pb-24">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Ciencia del cuerpo</h1>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Aprende cómo tu entrenamiento, recuperación y nutrición trabajan juntos.
        </p>
      </div>

      <div className="mt-5 px-4">
        <HeroCard article={featuredArticle} onSelect={onSelectArticle} />
      </div>

      {Object.entries(articlesByCategory).map(([category, articles]) => (
        <CategoryCarousel
          key={category}
          category={category}
          caption={categoryCaptions[category]}
          articles={articles}
          onSelectArticle={onSelectArticle}
        />
      ))}
    </div>
  );
}

function HeroCard({
  article,
  onSelect,
}: {
  article: BodyScienceArticle;
  onSelect: (a: BodyScienceArticle) => void;
}) {
  return (
    <button
      onClick={() => onSelect(article)}
      className="relative w-full overflow-hidden rounded-2xl aspect-[16/9] text-left group"
    >
      <img
        src={heroTraining.src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2">
        <span
          className={cn(
            'self-start px-2.5 py-0.5 rounded-full text-[10px] font-semibold',
            categoryColors[article.category],
          )}
        >
          {categoryDisplayNames[article.category] || article.category}
        </span>
        <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">
          {article.title}
        </h2>
        <p className="text-xs text-white/70 line-clamp-1">{article.summary}</p>
        <div className="flex items-center gap-1.5 text-primary text-xs font-medium mt-1">
          Leer ahora <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}

function CategoryCarousel({
  category,
  caption,
  articles,
  onSelectArticle,
}: {
  category: string;
  caption?: string;
  articles: BodyScienceArticle[];
  onSelectArticle: (a: BodyScienceArticle) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mt-7">
      <div className="px-4 mb-3">
        <h3 className="text-base font-bold text-foreground">{categoryDisplayNames[category] || category}</h3>
        {caption && (
          <p className="text-xs text-muted-foreground mt-0.5">{caption}</p>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto hide-scrollbar px-4 snap-x snap-mandatory"
      >
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            thumbnail={categoryThumbnails[article.category]}
            onSelect={onSelectArticle}
          />
        ))}
      </div>
    </div>
  );
}

function ArticleCard({
  article,
  thumbnail,
  onSelect,
}: {
  article: BodyScienceArticle;
  thumbnail: string;
  onSelect: (a: BodyScienceArticle) => void;
}) {
  return (
    <button
      onClick={() => onSelect(article)}
      className="flex-shrink-0 w-44 snap-start rounded-2xl bg-card overflow-hidden text-left group transition-colors hover:bg-card/80"
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <img
          src={thumbnail}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="p-3 space-y-2">
        <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 min-h-[2.5rem]">
          {article.title}
        </p>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[9px] font-semibold',
              categoryColors[article.category] || 'bg-secondary text-foreground',
            )}
          >
            {categoryDisplayNames[article.category] || article.category}
          </span>
          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {article.readTimeMinutes} min
          </span>
        </div>
      </div>
    </button>
  );
}
