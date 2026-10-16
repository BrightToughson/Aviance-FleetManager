import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useVehicles } from '../../context/VehicleContext';
import { useAssignments } from '../../context/AssignmentsContext';
import { useTranslation } from 'react-i18next';

import { useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ManagerSearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useUser();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { vehicles } = useVehicles();
  const { assignments } = useAssignments();

  React.useEffect(() => {
    if (user?.id) {
      AsyncStorage.getItem(`@manager_recent_searches_${user.id}`)
        .then(res => {
          if (res) setRecentSearches(JSON.parse(res));
          else setRecentSearches([]);
        })
        .catch(console.error);
    } else {
      setRecentSearches([]);
    }
  }, [user?.id]);

  const searchDatabase = [
    ...(vehicles || []).map((v: any) => ({ id: v.id, type: 'Vehicle', title: v.name || v.make, icon: 'car-outline', route: `/(manager)/vehicles/${v.id}` })),
    ...(assignments || []).map((a: any) => ({ id: a.id, type: 'Assignment', title: `${a.pickupLocation} to ${a.dropoffLocation}`, icon: 'map-outline', route: `/(manager)/assignments/${a.id}` }))
  ];

  const filteredResults = searchDatabase.filter(item => 
    item.title && item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.type && item.type.toLowerCase().includes(query.toLowerCase())
  );
  const handleSelectResult = (item: any) => {
    if (!recentSearches.includes(item.title)) {
      const updated = [item.title, ...recentSearches].slice(0, 10);
      setRecentSearches(updated);
      if (user?.id) {
        AsyncStorage.setItem(`@manager_recent_searches_${user.id}`, JSON.stringify(updated)).catch(console.error);
      }
    }
    router.replace(item.route as any);
    setQuery('');
  };

  const handleClearRecents = () => {
    setRecentSearches([]);
    if (user?.id) {
      AsyncStorage.removeItem(`@manager_recent_searches_${user.id}`).catch(console.error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder={t('m_search_placeholder', 'Search drivers, vehicles, assignments...')}
            placeholderTextColor="#9CA3AF"
            autoFocus
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {!query ? (
          <View>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>{t('m_search_recent', 'Recent Searches')}</Text>
              {recentSearches.length > 0 && (
                <TouchableOpacity onPress={handleClearRecents}>
                  <Text style={styles.clearText}>{t('m_search_clear', 'Clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {recentSearches.length > 0 ? (
              recentSearches.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.recentItem}
                  onPress={() => setQuery(item)}
                >
                  <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                  <Text style={styles.recentText}>{item}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyRecentText}>{t('m_search_no_recent', 'No recent searches')}</Text>
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>{t('m_search_results', 'Search Results')}</Text>
            {filteredResults.length > 0 ? (
              filteredResults.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.resultItem}
                  onPress={() => handleSelectResult(item)}
                >
                  <View style={styles.resultIconWrapper}>
                    <Ionicons name={item.icon as any} size={20} color="#043094" />
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    <Text style={styles.resultType}>{item.type}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>{t('m_search_no_results', 'No results found for')}{` "${query}"`}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginTop: 10 },
  backBtn: { marginRight: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, height: '100%', fontSize: 16, marginLeft: 8, color: '#111827', outlineStyle: 'none' as any },
  content: { flex: 1, padding: 20 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  clearText: { color: '#043094', fontSize: 14, fontWeight: '600' },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  recentText: { fontSize: 16, color: '#4B5563', marginLeft: 12 },
  emptyRecentText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', marginTop: 10 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  resultIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  resultTextContainer: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: '500', color: '#111827' },
  resultType: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
});
