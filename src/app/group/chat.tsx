import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export default function GroupChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, title, description, max_members, created_by, event_id, event_name, event_image_url, event_date, event_location } = useLocalSearchParams<{
    id: string;
    title: string;
    description: string;
    max_members: string;
    created_by: string;
    event_id: string;
    event_name: string;
    event_image_url: string;
    event_date: string;
    event_location: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const parseMessage = (row: any): Message => ({
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    first_name: row.users?.first_name ?? '',
    last_name: row.users?.last_name ?? '',
    avatar_url: row.users?.avatar_url ?? null,
  });

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        user_id,
        content,
        created_at,
        users (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('group_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages((data ?? []).map(parseMessage));
    }
  }, [id]);

  // Subscribe to realtime inserts
  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`group-chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${id}`,
        },
        async (payload) => {
          // Fetch the full message with user info
          const { data } = await supabase
            .from('messages')
            .select(`
              id,
              user_id,
              content,
              created_at,
              users (
                first_name,
                last_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              // Avoid duplicates (own messages already added optimistically)
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, parseMessage(data)];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchMessages]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    if (!text.trim() || !user || sending) return;

    const content = text.trim();
    setText('');
    setSending(true);

    const { data, error } = await supabase
      .from('messages')
      .insert({ group_id: id, user_id: user.id, content })
      .select(`
        id,
        user_id,
        content,
        created_at,
        users (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      setText(content); // Restore text on failure
    } else if (data) {
      // Add optimistically (realtime will skip duplicate)
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, parseMessage(data)];
      });
    }
    setSending(false);
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateSeparator(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Vandaag';
    if (d.toDateString() === yesterday.toDateString()) return 'Gisteren';
    return d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    const prev = new Date(messages[index - 1].created_at).toDateString();
    const curr = new Date(messages[index].created_at).toDateString();
    return prev !== curr;
  }

  function renderMessage({ item, index }: { item: Message; index: number }) {
    const isOwn = item.user_id === user?.id;
    const showDate = shouldShowDateSeparator(index);
    const initials = `${item.first_name.charAt(0)}${item.last_name.charAt(0)}`.toUpperCase();

    // Show avatar/name if previous message is from a different user or separated by date
    const showSender =
      !isOwn &&
      (index === 0 ||
        showDate ||
        messages[index - 1].user_id !== item.user_id);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.created_at)}</Text>
          </View>
        )}

        {/* Sender name above bubble */}
        {showSender && (
          <View style={styles.senderNameRow}>
            <View style={styles.messageAvatarSpacer} />
            <Text style={styles.senderName}>{item.first_name}</Text>
          </View>
        )}

        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {!isOwn && showSender && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user_id } })}
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.messageAvatar} />
              ) : (
                <View style={[styles.messageAvatar, styles.messageAvatarPlaceholder]}>
                  <Text style={styles.messageAvatarInitials}>{initials}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {!isOwn && !showSender && <View style={styles.messageAvatarSpacer} />}

          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
        </View>

        {/* Time below bubble */}
        <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
          {!isOwn && <View style={styles.messageAvatarSpacer} />}
          <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/group/[id]',
              params: {
                id,
                title,
                description: description ?? '',
                max_members: max_members ?? '',
                created_by: created_by ?? '',
                event_id: event_id ?? '',
                event_name: event_name ?? '',
                event_image_url: event_image_url ?? '',
                event_date: event_date ?? '',
                event_location: event_location ?? '',
              },
            })
          }
        >
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerSubtitle}>Tik voor groepsinfo</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nog geen berichten</Text>
            <Text style={styles.emptySubtext}>Stuur het eerste bericht!</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Schrijf een bericht..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Ionicons name="send" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dateSeparatorText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
    gap: Spacing.sm,
  },
  messageRowOwn: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
  },
  messageAvatarPlaceholder: {
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageAvatarInitials: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  messageAvatarSpacer: {
    width: 28,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  bubbleOwn: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Spacing.xs,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Spacing.xs,
  },
  senderNameRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: 2,
    marginTop: Spacing.sm,
  },
  senderName: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  messageText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timeRowOwn: {
    flexDirection: 'row-reverse',
  },
  messageTime: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    color: Colors.text,
    fontSize: FontSizes.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    padding: Spacing.sm,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
});
