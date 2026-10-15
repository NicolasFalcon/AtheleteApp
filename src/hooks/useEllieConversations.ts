import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import {
  deleteConversation,
  fetchConversationMessages,
  fetchConversations,
  fetchLastMessage,
  type EllieConversation,
} from '@app/services/ellie/ellieHistory';
import { fetchEllieUsage, type EllieUsage } from '@app/services/ellie/ellieService';

// React Query caches of ELLIE, always per user (signing out and in with
// another account never shows the previous one's conversations).
export const ellieKeys = {
  conversations: (userId?: string) => ['ellie', 'conversations', userId] as const,
  messages: (userId: string | undefined, conversationId: string) =>
    ['ellie', 'messages', userId, conversationId] as const,
  latest: (userId?: string) => ['ellie', 'latest', userId] as const,
  usage: (userId?: string) => ['ellie', 'usage', userId] as const,
};

export function useEllieConversations() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ellieKeys.conversations(profile?.id),
    enabled: Boolean(profile?.id),
    staleTime: 30_000,
    queryFn: fetchConversations,
  });
}

export function useEllieMessages(conversationId: string | null, enabled = true) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ellieKeys.messages(profile?.id, conversationId ?? ''),
    enabled: Boolean(profile?.id) && Boolean(conversationId) && enabled,
    // The thread is read fresh every time the chat opens.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    queryFn: () => fetchConversationMessages(conversationId as string),
  });
}

// The most recent conversation and its last line ("Retomar conversación").
export type EllieLatest = {
  conversation: EllieConversation;
  last: { content: string; createdAt: string } | null;
};

export function useEllieLatest() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ellieKeys.latest(profile?.id),
    enabled: Boolean(profile?.id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<EllieLatest | null> => {
      const [conversation] = await fetchConversations();
      if (!conversation) {
        return null;
      }
      const last = await fetchLastMessage(conversation.id);
      return {
        conversation,
        last: last ? { content: last.content, createdAt: last.createdAt } : null,
      };
    },
  });
}

export function useDeleteEllieConversation() {
  const { profile } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => deleteConversation(conversationId),
    onSuccess: () => invalidateEllieConversations(client, profile?.id),
  });
}

export function invalidateEllieConversations(client: QueryClient, userId?: string) {
  client.invalidateQueries({ queryKey: ellieKeys.conversations(userId) }).catch(() => undefined);
  client.invalidateQueries({ queryKey: ellieKeys.latest(userId) }).catch(() => undefined);
}

// Usage of the day: kept from every reply (`usage`), read from get_ellie_usage
// when nothing is cached. Used for the limit notice; the remaining count is
// shown only where the design has it.
export function useEllieUsage() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ellieKeys.usage(profile?.id),
    enabled: Boolean(profile?.id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: fetchEllieUsage,
  });
}

export function cacheEllieUsage(client: QueryClient, userId: string | undefined, usage: EllieUsage | null) {
  if (usage) {
    client.setQueryData(ellieKeys.usage(userId), usage);
  }
}
