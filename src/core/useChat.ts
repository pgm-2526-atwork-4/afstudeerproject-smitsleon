import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList } from 'react-native';
import { supabase } from './supabase';
import { useChatImages } from './useChatImages';
import { useLiveLocation } from './useLiveLocation';

// ── Types ──────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

interface GroupChatConfig {
  mode: 'group';
  groupId: string;
}

interface PrivateChatConfig {
  mode: 'private';
  otherUserId: string;
  otherFirstName: string;
  otherLastName: string;
  otherAvatarUrl: string | null;
}

export type ChatConfig = GroupChatConfig | PrivateChatConfig;

// ── Formatting helpers ─────────────────────────────────

export function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateSeparator(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Vandaag';
  if (d.toDateString() === yesterday.toDateString()) return 'Gisteren';
  return d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Hook ───────────────────────────────────────────────

export function useChat(userId: string | undefined, config: ChatConfig) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const LIVE_RE = /^📍LIVE:(.+)$/;

  const isGroup = config.mode === 'group';
  const channelId = isGroup
    ? config.groupId
    : [userId, config.otherUserId].sort().join('-');

  // ── Send location message ──────────────────────────
  const sendLocationMsg = useCallback(
    async (content: string) => {
      if (!userId) return;
      if (isGroup) {
        await supabase.from('messages').insert({ group_id: (config as GroupChatConfig).groupId, user_id: userId, content });
      } else {
        await supabase.from('private_messages').insert({ sender_id: userId, receiver_id: (config as PrivateChatConfig).otherUserId, content });
      }
    },
    [userId, config, isGroup],
  );

  const live = useLiveLocation({
    userId,
    ...(isGroup
      ? { groupId: (config as GroupChatConfig).groupId }
      : { otherUserId: (config as PrivateChatConfig).otherUserId }),
    sendMessage: sendLocationMsg,
  });

  const images = useChatImages({
    userId,
    sendMessage: sendLocationMsg,
  });

  // ── Parsers ────────────────────────────────────────

  type GroupMessageRow = {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    deleted_at: string | null;
    users: { first_name: string; last_name: string; avatar_url: string | null } | { first_name: string; last_name: string; avatar_url: string | null }[] | null;
  };

  function parseGroupMessage(row: GroupMessageRow): ChatMessage {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      deleted_at: row.deleted_at ?? null,
      first_name: u?.first_name ?? '',
      last_name: u?.last_name ?? '',
      avatar_url: u?.avatar_url ?? null,
    };
  }

  function parsePrivateMessage(row: {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    deleted_at: string | null;
  }): ChatMessage {
    const cfg = config as PrivateChatConfig;
    return {
      id: row.id,
      user_id: row.sender_id,
      content: row.content,
      created_at: row.created_at,
      deleted_at: row.deleted_at ?? null,
      first_name: row.sender_id === userId ? '' : cfg.otherFirstName,
      last_name: row.sender_id === userId ? '' : cfg.otherLastName,
      avatar_url: row.sender_id === userId ? null : cfg.otherAvatarUrl,
    };
  }

  // ── Fetch messages ─────────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (!userId) return;

    if (isGroup) {
      const groupId = (config as GroupChatConfig).groupId;
      const { data, error } = await supabase
        .from('messages')
        .select('id, user_id, content, created_at, deleted_at, users(first_name, last_name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages((data ?? []).map((row: any) => parseGroupMessage(row)));
      }
    } else {
      const otherUserId = (config as PrivateChatConfig).otherUserId;
      const { data } = await supabase
        .from('private_messages')
        .select('id, sender_id, content, created_at, deleted_at')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (data) setMessages(data.map((row: any) => parsePrivateMessage(row)));
    }
  }, [userId, config, isGroup]);

  // ── Realtime subscription ──────────────────────────

  useEffect(() => {
    fetchMessages();
    if (!userId) return;

    const table = isGroup ? 'messages' : 'private_messages';
    const channelName = isGroup ? `group-chat-${channelId}` : `private-chat-${channelId}`;

    const channelBuilder = supabase.channel(channelName);

    if (isGroup) {
      const groupId = (config as GroupChatConfig).groupId;

      channelBuilder
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `group_id=eq.${groupId}` }, async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('id, user_id, content, created_at, deleted_at, users(first_name, last_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, parseGroupMessage(data as GroupMessageRow)];
            });
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `group_id=eq.${groupId}` }, (payload) => {
          setMessages((prev) =>
            prev.map((m) => m.id === payload.new.id ? { ...m, content: payload.new.content, deleted_at: payload.new.deleted_at } : m)
          );
        });
    } else {
      const otherUserId = (config as PrivateChatConfig).otherUserId;

      channelBuilder
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, (payload) => {
          const msg = payload.new as { id: string; sender_id: string; receiver_id: string; content: string; created_at: string; deleted_at: string | null };
          const isHere =
            (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === userId);
          if (!isHere) return;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id)
              ? prev
              : [...prev, parsePrivateMessage(msg)]
          );
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, (payload) => {
          const msg = payload.new as { id: string; content: string; deleted_at: string | null };
          setMessages((prev) =>
            prev.map((m) => m.id === msg.id ? { ...m, content: msg.content, deleted_at: msg.deleted_at } : m)
          );
        });
    }

    channelBuilder.subscribe();
    return () => { supabase.removeChannel(channelBuilder); };
  }, [userId, channelId, fetchMessages, isGroup]);

  // ── Auto-scroll ────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ── Send message ───────────────────────────────────

  async function handleSend() {
    if (!text.trim() || !userId || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    if (isGroup) {
      const groupId = (config as GroupChatConfig).groupId;
      const { data, error } = await supabase
        .from('messages')
        .insert({ group_id: groupId, user_id: userId, content })
        .select('id, user_id, content, created_at, deleted_at, users(first_name, last_name, avatar_url)')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        setText(content);
      } else if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, parseGroupMessage(data as GroupMessageRow)];
        });
      }
    } else {
      const otherUserId = (config as PrivateChatConfig).otherUserId;
      const { data, error } = await supabase
        .from('private_messages')
        .insert({ sender_id: userId, receiver_id: otherUserId, content })
        .select('id, sender_id, content, created_at, deleted_at')
        .single();

      if (error) {
        setText(content);
      } else if (data) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.id) ? prev : [...prev, parsePrivateMessage(data)]
        );
      }
    }
    setSending(false);
  }

  // ── Delete message ─────────────────────────────────

  function handleDeleteMessage(msgId: string) {
    const table = isGroup ? 'messages' : 'private_messages';
    Alert.alert('Bericht verwijderen', 'Weet je zeker dat je dit bericht wilt verwijderen?', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from(table)
            .update({ deleted_at: new Date().toISOString(), content: '' })
            .eq('id', msgId);
          if (error) {
            Alert.alert('Fout', 'Bericht verwijderen mislukt.');
          } else {
            setMessages((prev) =>
              prev.map((m) => m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), content: '' } : m)
            );
          }
        },
      },
    ]);
  }

  // ── Display helpers ────────────────────────────────

  function shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    return new Date(messages[index - 1].created_at).toDateString() !== new Date(messages[index].created_at).toDateString();
  }

  function shouldShowTime(index: number): boolean {
    if (index === messages.length - 1) return true;
    const curr = messages[index];
    const next = messages[index + 1];
    if (curr.user_id !== next.user_id) return true;
    return curr.created_at.slice(0, 16) !== next.created_at.slice(0, 16);
  }

  return {
    messages,
    text,
    setText,
    sending,
    flatListRef,
    handleSend,
    handleDeleteMessage,
    shouldShowDateSeparator,
    shouldShowTime,
    live,
    images,
    LIVE_RE,
  };
}
