import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForms } from '../../../context/FormsContext';

export default function FormsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const router = useRouter();
  
  const { forms, toggleFormStatus, deleteForm } = useForms();
  
  const [searchQuery, setSearchQuery] = useState('');

  const filteredForms = forms.filter(f => 
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Custom Forms</Text>
          <Text style={styles.pageSubtitle}>Create and share dynamic forms with anyone</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(manager)/forms/create' as any)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Create New Form</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search forms..." 
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
      </View>

      <View style={styles.grid}>
        {filteredForms.map((form) => (
          <TouchableOpacity 
            key={form.id} 
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/(manager)/forms/${form.id}` as any)}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.statusBadge, form.active ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                <View style={[styles.statusIndicator, form.active ? styles.statusActive : styles.statusInactive]} />
                <Text style={[styles.statusText, form.active ? styles.statusTextActive : styles.statusTextInactive]}>
                  {form.active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    // @ts-ignore
                    if (window.confirm('Are you sure you want to delete this form?')) {
                      deleteForm(form.id);
                    }
                  } else {
                    Alert.alert('Delete Form', 'Are you sure you want to delete this form?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteForm(form.id) }
                    ]);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.formId}>{form.id}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>{form.title}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{form.description}</Text>
            
            <View style={styles.cardFooter}>
              <Text style={styles.fieldCount}>{form.fields.length} Fields</Text>
              <View style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#043094" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerRowMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 16 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  primaryBtn: { backgroundColor: '#043094', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  actionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 40, flex: 1, minWidth: 250, maxWidth: 400 },
  searchInput: { flex: 1, marginLeft: 8, color: '#111827', outlineStyle: 'none' } as any,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: { backgroundColor: '#fff', width: 300, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  deleteBtn: { padding: 4, borderRadius: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusBadgeActive: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusBadgeInactive: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  statusIndicator: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusActive: { backgroundColor: '#10B981' },
  statusInactive: { backgroundColor: '#9CA3AF' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextActive: { color: '#059669' },
  statusTextInactive: { color: '#4B5563' },
  formId: { fontSize: 12, color: '#6B7280', fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20, minHeight: 40, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  fieldCount: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionBtnText: { fontSize: 13, color: '#043094', fontWeight: '600', marginRight: 4 },
});
