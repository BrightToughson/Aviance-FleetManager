import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useIssues } from '../../../context/IssuesContext';

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { issues } = useIssues();

  const issue = issues.find(i => i.id === id);

  if (!issue) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Issue not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backNav} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#4B5563" />
        <Text style={styles.backNavText}>Back to Issues</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.idText}>{issue.id}</Text>
            <Text style={styles.title}>{issue.issue}</Text>
          </View>
          <View style={[styles.badge, issue.status === 'Resolved' ? styles.badgeSuccess : issue.status === 'Open' ? styles.badgeDanger : styles.badgeWarning]}>
            <Text style={[styles.badgeText, issue.status === 'Resolved' ? styles.badgeSuccessText : issue.status === 'Open' ? styles.badgeDangerText : styles.badgeWarningText]}>
              {issue.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>{issue.vehicle}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Reported By</Text>
            <Text style={styles.detailValue}>{issue.reporter}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{issue.date}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Priority</Text>
            <Text style={[styles.detailValue, issue.priority === 'High' ? {color: '#EF4444'} : issue.priority === 'Medium' ? {color: '#F59E0B'} : undefined]}>
              {issue.priority}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Update Status</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionBtn, styles.btnWarning]}>
            <Text style={styles.btnWarningText}>Mark In Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.btnSuccess]}>
            <Text style={styles.btnSuccessText}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#6B7280', marginBottom: 16 },
  backBtn: { backgroundColor: '#043094', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  backNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backNavText: { marginLeft: 8, color: '#4B5563', fontSize: 16, fontWeight: '500' },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  idText: { fontSize: 14, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeDanger: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 14, fontWeight: '600' },
  badgeSuccessText: { color: '#059669' },
  badgeWarningText: { color: '#D97706' },
  badgeDangerText: { color: '#DC2626' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  detailItem: { minWidth: 150, flex: 1 },
  detailLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 16 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnWarning: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  btnWarningText: { color: '#D97706', fontWeight: '600' },
  btnSuccess: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  btnSuccessText: { color: '#059669', fontWeight: '600' },
});
