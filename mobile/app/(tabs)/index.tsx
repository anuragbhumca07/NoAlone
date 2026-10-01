import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Modal, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiCompanionAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/constants';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';

const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

function CompanionHeader({ companion, onEdit }: { companion: any; onEdit: () => void }) {
  const genderEmoji = companion?.gender === 'MALE' ? '🧑' : companion?.gender === 'FEMALE' ? '👩' : '🤖';
  return (
    <View style={styles.companionHeader}>
      <View style={styles.companionAvatar}>
        <Text style={styles.companionEmoji}>{genderEmoji}</Text>
      </View>
      <View style={styles.companionInfo}>
        <Text style={styles.companionName}>{companion?.name || 'Alex'}</Text>
        <Text style={styles.companionSub}>Your AI buddy · always here to talk</Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
        <Ionicons name="settings-outline" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function MessageBubble({ item, meId }: { item: any; meId: string }) {
  const isUser = item.role === 'USER';
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
      <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
        {item.content}
      </Text>
    </View>
  );
}

export default function AiBuddyScreen() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [text, setText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [companionGender, setCompanionGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [localMessages, setLocalMessages] = useState<any[]>([]);

  const { data: companion, isLoading: companionLoading } = useQuery({
    queryKey: ['aiCompanion'],
    queryFn: () => aiCompanionAPI.getCompanion().then((r) => r.data),
    retry: 1,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['aiMessages'],
    queryFn: () => aiCompanionAPI.getMessages().then((r) => r.data),
    retry: 1,
  });

  useEffect(() => {
    if (messages) setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (companion) {
      setCompanionName(companion.name || 'Alex');
      setCompanionGender(companion.gender || 'OTHER');
    }
  }, [companion]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => aiCompanionAPI.sendMessage(content),
    onMutate: (content) => {
      const optimistic = {
        id: `temp-${Date.now()}`,
        role: 'USER',
        content,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, optimistic]);
      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onSuccess: (res) => {
      const { userMessage, aiMessage } = res.data;
      setLocalMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
        return [...filtered, userMessage, aiMessage];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: () => {
      setLocalMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      showMessage({ message: 'Failed to send message', type: 'danger' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; gender: string }) => aiCompanionAPI.updateCompanion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aiCompanion'] });
      setShowSettings(false);
      showMessage({ message: 'Companion updated!', type: 'success' });
    },
    onError: () => showMessage({ message: 'Failed to update companion', type: 'danger' }),
  });

  const clearMutation = useMutation({
    mutationFn: () => aiCompanionAPI.clearMessages(),
    onSuccess: () => {
      setLocalMessages([]);
      showMessage({ message: 'Chat cleared', type: 'info' });
    },
  });

  const handleSend = () => {
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate(text.trim());
  };

  if (companionLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <CompanionHeader companion={companion} onEdit={() => setShowSettings(true)} />

      {localMessages.length === 0 && !messagesLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Say hi to {companion?.name || 'Alex'}!</Text>
          <Text style={styles.emptySub}>Your AI buddy is ready to chat. Ask anything.</Text>
          {['How are you?', "Tell me something interesting", "I'm feeling lonely"].map((s) => (
            <TouchableOpacity key={s} style={styles.suggestion} onPress={() => sendMutation.mutate(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={localMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => <MessageBubble item={item} meId={user?.id || ''} />}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {sendMutation.isPending && (
        <View style={styles.typing}>
          <Text style={styles.typingText}>{companion?.name || 'Alex'} is typing…</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder={`Message ${companion?.name || 'Alex'}…`}
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customize Buddy</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={companionName}
              onChangeText={setCompanionName}
              placeholder="Buddy's name"
              placeholderTextColor={COLORS.textMuted}
              maxLength={20}
            />

            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, companionGender === g && styles.genderBtnActive]}
                  onPress={() => setCompanionGender(g)}
                >
                  <Text style={[styles.genderText, companionGender === g && styles.genderTextActive]}>
                    {g.charAt(0) + g.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => updateMutation.mutate({ name: companionName, gender: companionGender })}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.saveBtnText}>
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { setShowSettings(false); clearMutation.mutate(); }}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              <Text style={styles.clearBtnText}>Clear chat history</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  companionHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
    gap: 12,
  },
  companionAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: `${COLORS.primary}30`, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  companionEmoji: { fontSize: 24 },
  companionInfo: { flex: 1 },
  companionName: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  companionSub: { color: COLORS.textMuted, fontSize: 12 },
  editBtn: { padding: 6 },

  messages: { padding: 16, gap: 10, paddingBottom: 20 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginVertical: 3 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAI: { color: COLORS.text },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  suggestion: {
    backgroundColor: COLORS.surface, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginTop: 4,
  },
  suggestionText: { color: COLORS.primaryLight, fontSize: 14 },

  typing: { paddingHorizontal: 20, paddingBottom: 6 },
  typingText: { color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  textInput: {
    flex: 1, backgroundColor: COLORS.surfaceLight, borderRadius: 22, paddingHorizontal: 16,
    paddingVertical: 10, color: COLORS.text, fontSize: 15, maxHeight: 120,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, gap: 12,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  fieldInput: {
    backgroundColor: COLORS.surfaceLight, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, color: COLORS.text, fontSize: 15,
    borderWidth: 1, borderColor: COLORS.border,
  },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceLight,
  },
  genderBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` },
  genderText: { color: COLORS.textSecondary, fontSize: 14 },
  genderTextActive: { color: COLORS.primary, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  clearBtnText: { color: COLORS.error, fontSize: 14 },
});
