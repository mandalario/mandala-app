ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text';

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
  ON public.chat_messages(conversation_user, created_at DESC);