import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function MaintenanceDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          vehicles ( name, make, model, license_plate )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      setRequest(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading details...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Request not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(manager)/maintenance')}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(manager)/maintenance')} style={styles.backNav}>
          <Ionicons name="arrow-back" size={20} color="#4B5563" />
          <Text style={styles.backNavText}>Back to Maintenance</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Maintenance Request Details</Text>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.issueId}>ID: {request.id.slice(0, 8)}</Text>
            <Text style={styles.date}>{new Date(request.created_at).toLocaleString()}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            request.status === 'resolved' ? styles.statusSuccess : 
            request.status === 'in_progress' ? styles.statusWarning : 
            styles.statusDanger
          ]}>
            <Text style={[
              styles.statusText,
              request.status === 'resolved' ? styles.statusSuccessText : 
              request.status === 'in_progress' ? styles.statusWarningText : 
              styles.statusDangerText
            ]}>{request.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>Vehicle</Text>
        <Text style={styles.value}>{request.vehicles?.name || request.vehicles?.license_plate || 'Unknown Vehicle'}</Text>

        <Text style={styles.label}>Description & Notes</Text>
        <Text style={styles.descValue}>{request.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  errorText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
  backBtn: { backgroundColor: '#043094', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%' },
  header: { marginBottom: 24 },
  backNav: { flexDirection: 'row', alignItems: 'center' },
  backNavText: { marginLeft: 8, color: '#4B5563', fontWeight: '500' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  issueId: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 4 },
  date: { fontSize: 13, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusSuccess: { backgroundColor: '#D1FAE5' },
  statusWarning: { backgroundColor: '#DBEAFE' },
  statusDanger: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusSuccessText: { color: '#059669' },
  statusWarningText: { color: '#1D4ED8' },
  statusDangerText: { color: '#DC2626' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 20 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  value: { fontSize: 16, color: '#111827', fontWeight: '600', marginBottom: 20 },
  descValue: { fontSize: 15, color: '#374151', lineHeight: 24 }
});
