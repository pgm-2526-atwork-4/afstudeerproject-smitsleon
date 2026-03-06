import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
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
  sender_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

export default function PrivateChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId, firstName, lastName, avatarUrl } = useLocalSearchParams<{
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const initials = `${(firstName ?? '').charAt(0)}${(lastName ?? '').charAt(0)}`.toUpperCase();

  const fetchMessages = useCallback(async () => {
    if (!user || !userId) return;
    const { data, error } = await supabase
      .from('private_messages')
      .select('id, sender_id, content, created_at, deleted_at')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching private messages:', error);
    } else {
      setMessages(data ?? []);
    }
  }, [user, userId]);

  useEffect(() => {
    fetchMessages();

    if (!user || !userId) return;

    const channel = supabase
      .channel(`private-chat-${[user.id, userId].sort().join('-')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          const msg = payload.new as any;
          // Only process messages for this conversation
          const isThisConvo =
            (msg.sender_id === user.id && msg.receiver_id === userId) ||
            (msg.sender_id === userId && msg.receiver_id === user.id);
          if (!isThisConvo) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, {
              id: msg.id,
              sender_id: msg.sender_id,
              content: msg.content,
              created_at: msg.created_at,
              deleted_at: msg.deleted_at ?? null,
            }];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
        },
        (payload) => {
          const msg = payload.new as any;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id ? { ...m, content: msg.content, deleted_at: msg.deleted_at } : m
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId, fetchMessages]);

  // Auto-scroll
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
      .from('private_messages')
      .insert({ sender_id: user.id, receiver_id: userId, content })
      .select('id, sender_id, content, created_at, deleted_at')
      .single();

    if (error) {
      console.error('Error sending private message:', error);
      setText(content);
    } else if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    }
    setSending(false);
  }

  async function handleDeleteMessage(msgId: string) {
    Alert.alert('Bericht verwijderen', 'Weet je zeker dat je dit bericht wilt verwijderen?', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('private_messages')
            .update({ deleted_at: new Date().toISOString(), content: '' })
            .eq('id', msgId);
          if (error) {
            Alert.alert('Fout', 'Bericht verwijderen mislukt.');
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), content: '' } : m))
            );
          }
        },
      },
    ]);
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
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
    return new Date(messages[index - 1].created_at).toDateString() !== new Date(messages[index].created_at).toDateString();
  }

  function shouldShowTime(index: number): boolean {
    if (index === messages.length - 1) return true;
    const curr = messages[index];
    const next = messages[index + 1];
    if (curr.sender_id !== next.sender_id) return true;
    return curr.created_at.slice(0, 16) !== next.created_at.slice(0, 16);
  }

  function renderMessage({ item, index }: { item: Message; index: number }) {
    const isOwn = item.sender_id === user?.id;
    const showDate = shouldShowDateSeparator(index);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.created_at)}</Text>
          </View>
        )}

        <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
          {item.deleted_at ? (
            <View style={[styles.bubbleWrapper, styles.bubble, styles.bubbleDeleted]}>
              <Text style={styles.deletedText}>Dit bericht is verwijderd</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.bubbleWrapper}
              activeOpacity={0.8}
              onLongPress={() => { if (isOwn) handleDeleteMessage(item.id); }}
              delayLongPress={500}
            >
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                <Text style={styles.messageText}>{item.content}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {shouldShowTime(index) && (
          <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
            <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerInfo}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: userId } })}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                <Text style={styles.headerAvatarInitials}>{initials}</Text>
              </View>
            )}
            <View>
              <Text style={styles.headerTitle} numberOfLines={1}>{firstName} {lastName}</Text>
              <Text style={styles.headerSubtitle}>Privé chat</Text>
            </View>
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
              <Ionicons name="chatbubble-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Nog geen berichten</Text>
              <Text style={styles.emptySubtext}>Stuur {firstName} een bericht!</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
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
  backButton: { padding: Spacing.xs },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceLight,
  },
  headerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitials: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
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
  emptyContainer: { alignItems: 'center', gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600' },
  emptySubtext: { color: Colors.textMuted, fontSize: FontSizes.sm },
  dateSeparator: { alignItems: 'center', marginVertical: Spacing.md },
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
    gap: 6,
  },
  messageRowOwn: { flexDirection: 'row-reverse' },
  bubbleWrapper: { maxWidth: '80%', flexShrink: 1 },
  bubble: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  bubbleOwn: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleDeleted: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deletedText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontStyle: 'italic' },
  messageText: { color: Colors.text, fontSize: FontSizes.md, lineHeight: 20 },
  timeRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  timeRowOwn: { flexDirection: 'row-reverse' },
  messageTime: { color: Colors.textMuted, fontSize: 10 },
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
  sendButtonDisabled: { backgroundColor: Colors.surfaceLight },
});
