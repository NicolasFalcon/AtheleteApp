import { ArrowLeft, Clock } from 'lucide-react';
import { BodyScienceArticle } from '@/lib/types';
import { categoryDisplayNames } from '@/lib/bodyScienceData';
import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  Training: 'bg-secondary text-foreground',
  Recovery: 'bg-secondary text-foreground',
  Nutrition: 'bg-secondary text-foreground',
  Mindset: 'bg-secondary text-foreground',
};

interface BodyScienceArticleScreenProps {
  article: BodyScienceArticle;
  onBack: () => void;
}

export function BodyScienceArticleScreen({ article, onBack }: BodyScienceArticleScreenProps) {
  return (
    <div className="app-screen animate-fade-in page-safe-bottom">
      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 pb-3 pt-3 safe-area-pt">
          <button
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card border border-border/60"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-foreground truncate">{article.title}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', categoryColors[article.category])}>
            {categoryDisplayNames[article.category] || article.category}
          </span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">{article.readTimeMinutes} min de lectura</span>
          </div>
        </div>

        <div className="prose-dark space-y-4">
          {article.content.split('\n\n').map((paragraph, i) => {
            if (paragraph.startsWith('## ')) {
              return (
                <h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-2">
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            if (paragraph.startsWith('**') || paragraph.startsWith('- **') || paragraph.startsWith('1.')) {
              const lines = paragraph.split('\n');
              return (
                <div key={i} className="space-y-2">
                  {lines.map((line, j) => (
                    <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                      {renderBoldText(line)}
                    </p>
                  ))}
                </div>
              );
            }
            return (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {renderBoldText(paragraph)}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-semibold text-foreground">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
