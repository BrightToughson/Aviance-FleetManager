import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import SummaryBox from '../../components/SummaryBox';
import { useInspections } from '../../context/InspectionContext';

export default function DriverInspections() {
  const router = useRouter();
  const { inspections } = useInspections();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Inspections</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => router.push('/(driver)/new-inspection')}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 20, paddingBottom: 0 }}>
        <SummaryBox items={[
          { label: 'Total', count: inspections.length, icon: 'clipboard', color: '#ffffff' },
          { label: 'Passed', count: inspections.filter(i => i.status === 'Passed').length, icon: 'checkmark-circle', color: '#34D399' },
          { label: 'Failed', count: inspections.filter(i => i.status === 'Failed').length, icon: 'close-circle', color: '#F87171' }
        ]} />
      </View>

      <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {inspections.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="clipboard" size={24} color="#043094" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.itemTitle}>{item.type} Inspection</Text>
                  <Text style={styles.itemDate}>{item.date}</Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: item.status === 'Passed' ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.badgeText, { color: item.status === 'Passed' ? '#059669' : '#DC2626' }]}>
                  {item.status}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.cardFooter}>
              <View style={styles.footerItem}>
                <Ionicons name="car-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.footerText}>{item.vehicle}</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.actionText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043094',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#4B5563',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#043094',
  },
});
