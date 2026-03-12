import { ChatBubble } from '@/components/design/ChatBubble';
import { ChatInput } from '@/components/design/ChatInput';
import { LocationShareModal } from '@/components/design/LocationShareModal';
import { UserAvatar } from '@/components/design/UserAvatar';
import { useAuth } from '@/core/AuthContext';
import { ChatMessage, formatDateSeparator, formatTime, useChat } from '@/core/useChat';
import { Colors, FontSizes, Radius, Spacing } from '@/style/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PrivateChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userId, firstName, lastName, avatarUrl } = useLocalSearchParams<{
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  }>();

  const chat = useChat(user?.id, {
    mode: 'private',
    otherUserId: userId,
    otherFirstName: firstName ?? '',
    otherLastName: lastName ?? '',
    otherAvatarUrl: avatarUrl || null,
  });

  const initials = `${(firstName ?? '')[0] ?? ''}${(lastName ?? '')[0] ?? ''}`.toUpperCase();

  function renderMessage({ item, index }: { item: ChatMessage; index: number }) {
    const isOwn = item.user_id === user?.id;
    const showDate = chat.shouldShowDateSeparator(index);
    const showTime = chat.shouldShowTime(index);

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
            onLongPress={isOwn ? () => chat.handleDeleteMessage(item.id) : undefined}
            liveLocation={(() => {
              const m = item.content.match(chat.LIVE_RE);
              return m ? chat.live.liveLocations[m[1]] ?? null : undefined;
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
          ref={chat.flatListRef}
          data={chat.messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.list, chat.messages.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubble-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Nog geen berichten</Text>
              <Text style={styles.emptySubtext}>Stuur {firstName} een bericht!</Text>
            </View>
          }
        />

        {chat.live.activeLiveId && (
          <TouchableOpacity style={styles.liveBanner} onPress={chat.live.stopSharing}>
            <Ionicons name="radio" size={16} color={Colors.primary} />
            <Text style={styles.liveBannerText}>Je deelt je live locatie</Text>
            <Text style={styles.liveBannerStop}>Stop</Text>
          </TouchableOpacity>
        )}

        <ChatInput
          value={chat.text}
          onChange={chat.setText}
          onSend={chat.handleSend}
          sending={chat.sending}
          onLocationPress={() => chat.live.setShowModal(true)}
          locationLoading={chat.live.loading}
          onImagePress={chat.images.pickAndSend}
          imageLoading={chat.images.imageLoading}
        />

        <LocationShareModal
          visible={chat.live.showModal}
          onClose={() => chat.live.setShowModal(false)}
          onShareCurrent={chat.live.shareCurrentLocation}
          onShareLive={chat.live.shareLiveLocation}
          isSharing={!!chat.live.activeLiveId}
          onStopSharing={chat.live.stopSharing}
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
