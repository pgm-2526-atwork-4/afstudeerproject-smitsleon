import { ChatBubble } from '@/components/design/ChatBubble';
import { ChatInput } from '@/components/design/ChatInput';
import { LocationShareModal } from '@/components/design/LocationShareModal';
import { UserAvatar } from '@/components/design/UserAvatar';
import { useAuth } from '@/core/AuthContext';
import { supabase } from '@/core/supabase';
import { useChatImages } from '@/core/useChatImages';
import { useLiveLocation } from '@/core/useLiveLocation';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
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

  const LIVE_RE = /^📍LIVE:(.+)$/;

  const sendLocationMsg = useCallback(
    async (content: string) => {
      if (!user) return;
      await supabase.from('messages').insert({ group_id: id, user_id: user.id, content });
    },
    [id, user],
  );

  const live = useLiveLocation({
    userId: user?.id,
    groupId: id,
    sendMessage: sendLocationMsg,
  });

  const images = useChatImages({
    userId: user?.id,
    sendMessage: sendLocationMsg,
  });

  const parseMessage = (row: any): Message => ({
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    deleted_at: row.deleted_at ?? null,
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
        deleted_at,
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
          const { data } = await supabase
            .from('messages')
            .select(`
              id,
              user_id,
              content,
              created_at,
              deleted_at,
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
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, parseMessage(data)];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id
                ? { ...m, content: payload.new.content, deleted_at: payload.new.deleted_at }
                : m
            )
          );
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
        deleted_at,
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

  async function handleDeleteMessage(msgId: string) {
    Alert.alert('Bericht verwijderen', 'Weet je zeker dat je dit bericht wilt verwijderen?', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('messages')
            .update({ deleted_at: new Date().toISOString(), content: '' })
            .eq('id', msgId);
          if (error) {
            console.error('Error deleting message:', error);
            Alert.alert('Fout', 'Bericht verwijderen mislukt. Probeer opnieuw.');
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

  function shouldShowTime(index: number): boolean {
    // Show time on the last message, or when the next message is from a different user
    // or sent in a different minute
    if (index === messages.length - 1) return true;
    const curr = messages[index];
    const next = messages[index + 1];
    if (curr.user_id !== next.user_id) return true;
    const currMin = curr.created_at.slice(0, 16); // "YYYY-MM-DDTHH:MM"
    const nextMin = next.created_at.slice(0, 16);
    return currMin !== nextMin;
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
              <UserAvatar uri={item.avatar_url} initials={initials} size={28} />
            </TouchableOpacity>
          )}
          {!isOwn && !showSender && <View style={styles.messageAvatarSpacer} />}

          <ChatBubble
            content={item.content}
            isOwn={isOwn}
            isDeleted={!!item.deleted_at}
            onLongPress={isOwn ? () => handleDeleteMessage(item.id) : undefined}
            liveLocation={(() => {
              const m = item.content.match(LIVE_RE);
              return m ? live.liveLocations[m[1]] ?? null : undefined;
            })()}
          />
        </View>

        {/* Time below bubble — only if last in same-user/same-minute streak */}
        {shouldShowTime(index) && (
          <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
            {!isOwn && <View style={styles.messageAvatarSpacer} />}
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

      {live.activeLiveId && (
        <TouchableOpacity style={styles.liveBanner} onPress={live.stopSharing}>
          <Ionicons name="radio" size={16} color={Colors.primary} />
          <Text style={styles.liveBannerText}>Je deelt je live locatie</Text>
          <Text style={styles.liveBannerStop}>Stop</Text>
        </TouchableOpacity>
      )}

      <ChatInput
        value={text}
        onChange={setText}
        onSend={handleSend}
        sending={sending}
        onLocationPress={() => live.setShowModal(true)}
        locationLoading={live.loading}
        onImagePress={images.pickAndSend}
        imageLoading={images.imageLoading}
      />

      <LocationShareModal
        visible={live.showModal}
        onClose={() => live.setShowModal(false)}
        onShareCurrent={live.shareCurrentLocation}
        onShareLive={live.shareLiveLocation}
        isSharing={!!live.activeLiveId}
        onStopSharing={live.stopSharing}
      />
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
    gap: 6,
  },
  messageRowOwn: {
    flexDirection: 'row-reverse',
  },
  messageAvatarSpacer: {
    width: 28,
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
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary + '15',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  liveBannerText: {
    flex: 1,
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  liveBannerStop: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
});
