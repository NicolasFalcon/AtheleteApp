import { getSupabaseClient } from '@app/services/supabase/client';

// Reads and deletes of the history (RLS of owner). The app never inserts:
// ellie-chat writes both sides of every turn.

export type EllieConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type EllieStoredMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  imagePath: string | null;
  toolType: string | null;
  toolData: unknown;
  clientMessageId: string | null;
  createdAt: string;
};

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase no está configurado.');
  }
  // These tables are newer than the generated types.
  return supabase as unknown as { from: (table: string) => any };
}

export function mapConversation(row: Record<string, unknown>): EllieConversation {
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? row.created_at ?? ''),
  };
}

export function mapStoredMessage(row: Record<string, unknown>): EllieStoredMessage {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id ?? ''),
    role: row.role === 'user' ? 'user' : 'assistant',
    content: typeof row.content === 'string' ? row.content : '',
    imagePath: typeof row.image_path === 'string' ? row.image_path : null,
    toolType: typeof row.tool_type === 'string' ? row.tool_type : null,
    toolData: row.tool_data ?? null,
    clientMessageId: typeof row.client_message_id === 'string' ? row.client_message_id : null,
    createdAt: String(row.created_at ?? ''),
  };
}

export async function fetchConversations(): Promise<EllieConversation[]> {
  const { data, error } = await client()
    .from('ellie_conversations')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) {
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapConversation);
}

export async function fetchConversationMessages(conversationId: string): Promise<EllieStoredMessage[]> {
  const { data, error } = await client()
    .from('chat_messages')
    .select('id, conversation_id, role, content, image_path, tool_type, tool_data, client_message_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) {
    throw error;
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapStoredMessage);
}

// The last line of a conversation, for "Retomar".
export async function fetchLastMessage(conversationId: string): Promise<EllieStoredMessage | null> {
  const { data, error } = await client()
    .from('chat_messages')
    .select('id, conversation_id, role, content, image_path, tool_type, tool_data, client_message_id, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) {
    throw error;
  }
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  return row ? mapStoredMessage(row) : null;
}

// Deleting a conversation deletes its messages (server side).
export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await client().from('ellie_conversations').delete().eq('id', conversationId);
  if (error) {
    throw error;
  }
}
