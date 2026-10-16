import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, Animated, PanResponder, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { id: receiverId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiverName, setReceiverName] = useState('User');
  const [receiverAvatar, setReceiverAvatar] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (user?.id && receiverId) {
      fetchReceiver();
      fetchMessages();

      const channel = supabase
        .channel(`chat_${user.id}_${receiverId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `sender_id=eq.${receiverId}` // Listen for messages from them to us
          }, (payload) => {
            if (payload.new.receiver_id === user.id) {
              setMessages(prev => [...prev, payload.new]);
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'messages'
        }, (payload) => {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, receiverId]);

  const fetchReceiver = async () => {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', receiverId).single();
    if (data?.full_name) setReceiverName(data.full_name);
    if (data?.avatar_url) setReceiverAvatar(data.avatar_url);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user?.id})`)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      
      // Mark as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', receiverId)
        .eq('receiver_id', user?.id)
        .eq('is_read', false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;
    
    const msgText = newMessage.trim();
    setNewMessage('');
    
    // Optimistic UI update
    const tempMsg = {
      id: Math.random().toString(),
      sender_id: user.id,
      receiver_id: receiverId,
      message: msgText,
      created_at: new Date().toISOString(),
      is_read: false
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const { error } = await supabase.from('messages').insert([{
      sender_id: user.id,
      receiver_id: receiverId,
      message: msgText
    }]);

    if (error) {
      console.error('Error sending message:', error);
      // Ideally remove optimistic message or show error state
    }
  };

  const handleUnsend = async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) console.error('Error unsending message:', error);
  };

  const confirmUnsend = (messageId: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Unsend message? It will be deleted for everyone.")) {
        handleUnsend(messageId);
      }
    } else {
      Alert.alert(
        "Unsend Message",
        "Are you sure you want to unsend this message? It will be deleted for everyone.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Unsend", style: "destructive", onPress: () => handleUnsend(messageId) }
        ]
      );
    }
  };

  const SwipeableMessage = ({ isMe, onDelete, item }: any) => {
    const pan = useRef(new Animated.Value(0)).current;
    const [isOpen, setIsOpen] = useState(false);

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return isMe && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) {
            pan.setValue(Math.max(gestureState.dx, -60));
          } else if (isOpen && gestureState.dx > 0) {
            pan.setValue(Math.min(gestureState.dx - 60, 0));
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -30) {
            Animated.spring(pan, { toValue: -60, useNativeDriver: true }).start();
            setIsOpen(true);
          } else {
            Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
            setIsOpen(false);
          }
        },
      })
    ).current;

    return (
      <View style={{ width: '100%', marginBottom: 12 }}>
        {isMe && (
          <TouchableOpacity 
            onPress={onDelete}
            style={[styles.messageBubble, { position: 'absolute', right: 0, backgroundColor: '#FEE2E2', borderWidth: 0, width: 60, alignItems: 'center', justifyContent: 'center', zIndex: 0 }]}
          >
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
        <Animated.View
          style={{ transform: [{ translateX: pan }], zIndex: 1 }}
          {...(isMe ? panResponder.panHandlers : {})}
        >
          <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage, { marginBottom: 0 }]}>
            <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>
              {item.message}
            </Text>
            <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.theirMessageTime]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id;
    return <SwipeableMessage isMe={isMe} onDelete={() => confirmUnsend(item.id)} item={item} />;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.replace('/(manager)/messages')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            {receiverAvatar ? (
              <Image source={{ uri: receiverAvatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <Text style={styles.avatarText}>{receiverName ? receiverName.charAt(0).toUpperCase() : 'U'}</Text>
            )}
          </View>
          <View>
            <Text style={styles.headerTitle}>{receiverName}</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
           <TouchableOpacity style={{ marginRight: 20 }}>
             <Ionicons name="videocam" size={24} color="#043094" />
           </TouchableOpacity>
           <TouchableOpacity>
             <Ionicons name="call" size={22} color="#043094" />
           </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !newMessage.trim() && { opacity: 0.5 }]} 
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5DDD5' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'android' ? 40 : 16
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#043094' },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  messagesContainer: { padding: 16, paddingBottom: 20 },
  messageBubble: { 
    maxWidth: '80%', 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  myMessage: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 4
  },
  theirMessage: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4
  },
  messageText: { fontSize: 15, lineHeight: 22, color: '#111827' },
  myMessageText: { color: '#111827' },
  theirMessageText: { color: '#111827' },
  messageTime: { fontSize: 11, marginTop: 2, alignSelf: 'flex-end' },
  myMessageTime: { color: '#6B7280' },
  theirMessageTime: { color: '#6B7280' },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 12, 
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 12,
    color: '#111827'
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  }
});
