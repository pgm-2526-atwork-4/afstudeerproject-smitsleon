import { ChatBubble, SYSTEM_REGEX } from '@/components/design/ChatBubble';
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

  const chat = useChat(user?.id, { mode: 'group', groupId: id });

  function renderMessage({ item, index }: { item: ChatMessage; index: number }) {
    const isOwn = item.user_id === user?.id;
    const showDate = chat.shouldShowDateSeparator(index);
    const initials = `${item.first_name.charAt(0)}${item.last_name.charAt(0)}`.toUpperCase();
    const isSystem = SYSTEM_REGEX.test(item.content);

    const showSender =
      !isOwn &&
      !isSystem &&
      (index === 0 ||
        showDate ||
        chat.messages[index - 1].user_id !== item.user_id);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.created_at)}</Text>
          </View>
        )}

        {isSystem ? (
          <View style={styles.systemRow}>
            <ChatBubble
              content={item.content}
              isOwn={false}
              isDeleted={!!item.deleted_at}
            />
          </View>
        ) : (
          <>
            {showSender && (
              <View style={styles.senderNameRow}>
                <View style={styles.messageAvatarSpacer} />
                <Text style={styles.senderName}>{item.first_name}</Text>
              </View>
            )}

            <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
              {!isOwn && showSender && (
                <TouchableOpacity onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user_id } })}>
                  <UserAvatar uri={item.avatar_url} initials={initials} size={28} />
                </TouchableOpacity>
              )}
              {!isOwn && !showSender && <View style={styles.messageAvatarSpacer} />}

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

            {chat.shouldShowTime(index) && (
              <View style={[styles.timeRow, isOwn && styles.timeRowOwn]}>
                {!isOwn && <View style={styles.messageAvatarSpacer} />}
                <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
              </View>
            )}
          </>
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
          ref={chat.flatListRef}
          data={chat.messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messagesList,
            chat.messages.length === 0 && { flex: 1, justifyContent: 'center', alignItems: 'center' },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Nog geen berichten</Text>
              <Text style={styles.emptySubtext}>Stuur het eerste bericht!</Text>
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
  systemRow: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  liveBannerStop: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
});
