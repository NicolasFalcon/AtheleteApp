import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import {
  cacheEllieUsage,
  invalidateEllieConversations,
  useEllieLatest,
} from '@app/hooks/useEllieConversations';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { IOSAudioSession } from '@app/features/ellie/voice/audioSession';
import { ExpoSpeechListener } from '@app/features/ellie/voice/recognizer';
import { DeviceSpeaker } from '@app/features/ellie/voice/speaker';
import { VoiceController } from '@app/features/ellie/voice/voiceController';
import { INITIAL_VOICE, type VoiceState } from '@app/features/ellie/voice/voiceMachine';
import { createUuid } from '@app/lib/uuid';
import { sendEllieMessage } from '@app/services/ellie/ellieService';

// ELLIE Voz: everything on the device (Apple Speech to listen, the system
// voice to talk). What is said goes to ellie-chat as a normal message of the
// latest conversation, so it also appears in the chat.
export function useEllieVoice() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const language = useProfileLanguage();
  const queryClient = useQueryClient();
  const latest = useEllieLatest();
  const [state, setState] = useState<VoiceState>(INITIAL_VOICE);

  const languageRef = useRef(language);
  languageRef.current = language;
  const conversationRef = useRef<string | null>(null);
  if (conversationRef.current === null && latest.data?.conversation.id) {
    conversationRef.current = latest.data.conversation.id;
  }

  const controller = useMemo(
    () =>
      new VoiceController({
        listener: new ExpoSpeechListener(),
        speaker: new DeviceSpeaker(),
        audio: new IOSAudioSession(),
        language: () => languageRef.current,
        onState: setState,
        ask: async text => {
          const reply = await sendEllieMessage({
            conversationId: conversationRef.current,
            clientMessageId: createUuid(),
            message: text,
            mode: 'chat',
            clientContext: 'voice',
          });
          conversationRef.current = reply.conversationId;
          cacheEllieUsage(queryClient, userId, reply.usage);
          invalidateEllieConversations(queryClient, userId);
          return { text: reply.message.content, hasPlan: Boolean(reply.message.tool) };
        },
      }),
    [queryClient, userId],
  );

  useEffect(() => () => controller.destroy(), [controller]);

  return { state, language, controller, conversationId: conversationRef.current };
}
