import { BookOpen, ChevronRight } from 'lucide-react';
import { BodyScienceArticle } from '@/lib/types';
import { bodyScienceArticles, featuredArticleIds, categoryDisplayNames } from '@/lib/bodyScienceData';
import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  Training: 'bg-primary/15 text-primary',
  Recovery: 'bg-info/15 text-info',
  Nutrition: 'bg-foreground/15 text-foreground',
  Mindset: 'bg-accent/15 text-accent-foreground',
};

interface BodyScienceCardProps {
  onSelectArticle: (article: BodyScienceArticle) => void;
}

export function BodyScienceCard({ onSelectArticle }: BodyScienceCardProps) {
  const featured = featuredArticleIds
    .map(id => bodyScienceArticles.find(a => a.id === id))
    .filter(Boolean) as BodyScienceArticle[];

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Ciencia del cuerpo</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Aprende cómo tu entrenamiento, recuperación y nutrición trabajan juntos.
      </p>

      <div className="space-y-1.5">
        {featured.map(article => (
          <button
            key={article.id}
            onClick={() => onSelectArticle(article)}
            className="flex w-full items-center gap-3 p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', categoryColors[article.category])}>
                  {categoryDisplayNames[article.category] || article.category}
                </span>
                <span className="text-[10px] text-muted-foreground">{article.readTimeMinutes} min de lectura</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
