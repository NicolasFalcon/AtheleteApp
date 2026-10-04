import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { fetchEllieChatHistory } from '@app/services/supabase/ellie';

// The stored thread of the user (chat_messages): the single conversation
// ELLIE keeps. Shared by the portada ("Retomar conversación") and the chat.
export function useEllieHistory() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['ellie', 'chat', profile?.id],
    enabled: Boolean(profile?.id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: () => fetchEllieChatHistory(profile!.id),
  });
}
