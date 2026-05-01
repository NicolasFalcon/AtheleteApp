import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface ExerciseVideoModalProps {
  videoUrl: string;
  orientation?: 'portrait' | 'landscape' | null;
  onClose: () => void;
}

export function ExerciseVideoModal({ videoUrl, orientation, onClose }: ExerciseVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const isPortrait = orientation === 'portrait';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={handleBackdropClick}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm border border-border/60 transition-opacity hover:opacity-80"
        aria-label="Cerrar video"
      >
        <X className="h-5 w-5 text-foreground" />
      </button>

      <div className={`relative w-full max-h-[85vh] ${isPortrait ? 'max-w-[340px]' : 'max-w-[90vw] sm:max-w-2xl'}`}>
        <div className={`relative w-full overflow-hidden rounded-2xl ${isPortrait ? 'aspect-[9/16]' : 'aspect-video'}`}>
          <video ref={videoRef} src={videoUrl} autoPlay loop muted controls playsInline className="h-full w-full object-cover" />
        </div>
      </div>
    </div>
  );
}
