import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/expo';

export default function MessagesIndex() {
  const router = useRouter();
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useUser();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchConversations();
      }
    }, [user?.id])
  );

  useEffect(() => {
    if (user?.id) {
      fetchConversations();

      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`
          }, () => {
            fetchConversations();
          })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchConversations = async () => {
    try {
      // 1. Fetch all messages involving this manager
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Extract unique user IDs from messages
      const chatUserIds = new Set<string>();
      messages?.forEach(m => {
        if (m.sender_id !== user?.id && m.sender_id) chatUserIds.add(m.sender_id);
        if (m.receiver_id !== user?.id && m.receiver_id) chatUserIds.add(m.receiver_id);
      });

      // 2. Fetch drivers assigned to this manager
      const { data: assignedDrivers, error: driversError } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .eq('manager_id', user?.id)
        .neq('id', user?.id);
        
      if (driversError) throw driversError;
      
      let allProfiles = assignedDrivers || [];
      
      // Fetch any other users that have chatted with this manager (but aren't assigned to them)
      if (chatUserIds.size > 0) {
         const idsToFetch = Array.from(chatUserIds).filter(id => !allProfiles.find(p => p.id === id));
         if (idsToFetch.length > 0) {
            const { data: extraProfiles, error: extraError } = await supabase
              .from('profiles')
              .select('id, full_name, role, avatar_url')
              .in('id', idsToFetch);
            
            if (!extraError && extraProfiles) {
               allProfiles = [...allProfiles, ...extraProfiles];
            }
         }
      }

      if (allProfiles.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // 3. Process into conversations
      const enrichedUsers = allProfiles.map(driver => {
        // Find messages with this specific driver
        const conversation = messages?.filter(m => 
          (m.sender_id === driver.id && m.receiver_id === user?.id) || 
          (m.sender_id === user?.id && m.receiver_id === driver.id)
        ) || [];

        const latestMessage = conversation.length > 0 ? conversation[0] : null;
        
        // Count unread messages (assuming 'is_read' column exists, fallback to false if missing)
        const unreadCount = conversation.filter(m => m.sender_id === driver.id && m.is_read === false).length;

        return {
          ...driver,
          latestMessage,
          unreadCount,
          lastActivity: latestMessage ? new Date(latestMessage.created_at).getTime() : 0
        };
      });

      // Sort by latest message first
      enrichedUsers.sort((a, b) => b.lastActivity - a.lastActivity);

      setUsers(enrichedUsers);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('nav_messages', 'Messages')}</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search drivers..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#043094" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.userCard}
              onPress={() => router.push(`/(manager)/messages/${item.id}` as any)}
            >
              <View style={styles.avatar}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.full_name ? item.full_name.charAt(0).toUpperCase() : '?'}
                  </Text>
                )}
              </View>
              
              <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>{item.full_name || 'Unknown Driver'}</Text>
                  <Text style={[styles.timeText, item.unreadCount > 0 && { color: '#10B981', fontWeight: 'bold' }]}>
                    {formatTime(item.latestMessage?.created_at)}
                  </Text>
                </View>
                
                <View style={styles.messageRow}>
                  <Text style={[styles.messagePreview, item.unreadCount > 0 && { fontWeight: '600', color: '#111827' }]} numberOfLines={1}>
                    {item.latestMessage 
                      ? (item.latestMessage.sender_id === user?.id ? 'You: ' : '') + item.latestMessage.message 
                      : 'No messages yet'}
                  </Text>
                  
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No drivers found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', margin: 16, marginBottom: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginHorizontal: 16,
    marginBottom: 16
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#111827' },
  listContent: { paddingBottom: 40 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#043094'
  },
  userInfo: { flex: 1, justifyContent: 'center' },
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { fontSize: 17, fontWeight: '600', color: '#111827' },
  timeText: { fontSize: 13, color: '#6B7280' },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  messagePreview: { fontSize: 15, color: '#6B7280', flex: 1, marginRight: 16 },
  unreadBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 40, fontSize: 16 }
});
