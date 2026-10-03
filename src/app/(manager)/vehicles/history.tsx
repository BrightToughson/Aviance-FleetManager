import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const { id, type } = useLocalSearchParams();
  const router = useRouter();
  const isStatus = type === 'status';

  // Mock data
  const historyData = isStatus ? [
    { id: 1, date: 'Oct 25, 2026 - 14:30', title: 'Status Changed to In Shop', notes: 'Scheduled maintenance for brakes.', author: 'John Doe' },
    { id: 2, date: 'Oct 20, 2026 - 09:15', title: 'Status Changed to Active', notes: 'Vehicle received and inspected.', author: 'Jane Smith' },
    { id: 3, date: 'Sep 10, 2026 - 11:00', title: 'Status Changed to Out of Service', notes: 'Reported engine issues by driver.', author: 'Mike Ross' },
  ] : [
    { id: 1, date: 'Oct 25, 2026 - 14:30', title: 'Assigned to Texas Yard', notes: 'Transferred for new project.', author: 'John Doe' },
    { id: 2, date: 'Oct 20, 2026 - 09:15', title: 'Assigned to Alabama Yard', notes: 'Initial assignment upon purchase.', author: 'Jane Smith' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{isStatus ? 'Status History' : 'Group Assignment History'}</Text>
          <Text style={styles.subtitle}>ID: {id || 'N/A'}</Text>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.timeline}>
          {historyData.map((item, index) => (
            <View key={item.id} style={styles.timelineItem}>
              {/* Vertical line connecting dots */}
              {index !== historyData.length - 1 && <View style={styles.timelineLine} />}
              
              <View style={[styles.timelineDot, isStatus ? styles.statusDot : styles.groupDot]}>
                <Ionicons name={isStatus ? "flag" : "location"} size={16} color="#fff" />
              </View>
              
              <View style={styles.timelineContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.date}>{item.date}</Text>
                </View>
                <Text style={styles.notes}>{item.notes}</Text>
                <View style={styles.authorContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.author.charAt(0)}</Text>
                  </View>
                  <Text style={styles.author}>Updated by {item.author}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 3 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' } as any
    })
  },
  backBtn: { padding: 8, marginRight: 12, backgroundColor: '#F9FAFB', borderRadius: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  content: { padding: 24, paddingBottom: 60 },
  timeline: { paddingLeft: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 24, position: 'relative' },
  timelineLine: { position: 'absolute', left: 19, top: 40, bottom: -24, width: 2, backgroundColor: '#E5E7EB' },
  timelineDot: { 
    width: 40, height: 40, borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16, zIndex: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } as any
    })
  },
  statusDot: { backgroundColor: '#F59E0B' },
  groupDot: { backgroundColor: '#8B5CF6' },
  timelineContent: { 
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#F3F4F6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.03, shadowRadius: 6 },
      android: { elevation: 1 },
      web: { boxShadow: '0 4px 6px rgba(0,0,0,0.03)' } as any
    })
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  date: { fontSize: 12, color: '#6B7280', fontWeight: '500', backgroundColor: '#F9FAFB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  notes: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 12 },
  authorContainer: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarText: { fontSize: 10, fontWeight: 'bold', color: '#1D4ED8' },
  author: { fontSize: 13, color: '#6B7280', fontWeight: '500' }
});
