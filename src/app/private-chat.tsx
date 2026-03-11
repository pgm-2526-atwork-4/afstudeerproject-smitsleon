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
  sender_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
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

  const LIVE_RE = /^📍LIVE:(.+)$/;

  const sendLocationMsg = useCallback(
    async (content: string) => {
      if (!user) return;
      await supabase.from('private_messages').insert({ sender_id: user.id, receiver_id: userId, content });
    },
    [user, userId],
  );

  const live = useLiveLocation({
    userId: user?.id,
    otherUserId: userId,
    sendMessage: sendLocationMsg,
  });

  const images = useChatImages({
    userId: user?.id,
    sendMessage: sendLocationMsg,
  });

  const initials = `${(firstName ?? '')[0] ?? ''}${(lastName ?? '')[0] ?? ''}`.toUpperCase();

  const fetchMessages = useCallback(async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from('private_messages')
      .select('id, sender_id, content, created_at, deleted_at')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  }, [user, userId]);

  useEffect(() => {
    fetchMessages();
    if (!user || !userId) return;

    const channel = supabase
      .channel(`private-chat-${[user.id, userId].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, (payload) => {
        const msg = payload.new as any;
        const isHere = (msg.sender_id === user.id && msg.receiver_id === userId) || (msg.sender_id === userId && msg.receiver_id === user.id);
        if (!isHere) return;
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, { id: msg.id, sender_id: msg.sender_id, content: msg.content, created_at: msg.created_at, deleted_at: msg.deleted_at ?? null }]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'private_messages' }, (payload) => {
        const msg = payload.new as any;
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: msg.content, deleted_at: msg.deleted_at } : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, userId, fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
    if (error) { setText(content); }
    else if (data) { setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data]); }
    setSending(false);
  }

  async function handleDeleteMessage(msgId: string) {
    Alert.alert('Bericht verwijderen', 'Weet je zeker dat je dit bericht wilt verwijderen?', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('private_messages').update({ deleted_at: new Date().toISOString(), content: '' }).eq('id', msgId);
          if (error) Alert.alert('Fout', 'Bericht verwijderen mislukt.');
          else setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), content: '' } : m));
        },
      },
    ]);
  }

  function renderMessage({ item, index }: { item: Message; index: number }) {
    const isOwn = item.sender_id === user?.id;
    const showDate = index === 0 || new Date(messages[index - 1].created_at).toDateString() !== new Date(item.created_at).toDateString();
    const showTime = index === messages.length - 1 || item.sender_id !== messages[index + 1].sender_id || item.created_at.slice(0, 16) !== messages[index + 1].created_at.slice(0, 16);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSep}>
            <Text style={styles.dateSepText}>{formatDateSeparator(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
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
        {showTime && (
          <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerInfo}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: userId } })}
          >
            <UserAvatar uri={avatarUrl || null} initials={initials} size={36} />
            <View>
              <Text style={styles.headerName} numberOfLines={1}>{firstName} {lastName}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.list, messages.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Nog geen berichten</Text>
              <Text style={styles.emptySubtext}>Stuur {firstName} een bericht!</Text>
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
  backBtn: { padding: Spacing.xs },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerName: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: 'bold' },
  list: { padding: Spacing.md, paddingBottom: Spacing.sm },
  msgRow: { flexDirection: 'row', marginBottom: 2 },
  msgRowOwn: { justifyContent: 'flex-end' },
  timeRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  timeRowOwn: { justifyContent: 'flex-end' },
  timeText: { color: Colors.textMuted, fontSize: 10 },
  dateSep: { alignItems: 'center', marginVertical: Spacing.md },
  dateSepText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  empty: { alignItems: 'center', gap: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.md, fontWeight: '600' },
  emptySubtext: { color: Colors.textMuted, fontSize: FontSizes.sm },
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
