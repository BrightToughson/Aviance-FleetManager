import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MeterSyncScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState('Oct 25, 2026 - 14:00');
  const [currentMeter, setCurrentMeter] = useState(12430);
  
  const rotation = new Animated.Value(0);

  const handleSync = () => {
    setSyncing(true);
    
    // Animation for the sync icon
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();

    // Mock API call
    setTimeout(() => {
      setSyncing(false);
      rotation.stopAnimation();
      setLastSync('Just now');
      setCurrentMeter(prev => prev + Math.floor(Math.random() * 50) + 10);
    }, 2500);
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Telematics Sync</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip-outline" size={24} color="#0EA5E9" />
            <Text style={styles.cardTitle}>Telematics Device Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Connected</Text>
            </View>
          </View>
          
          <View style={styles.meterDisplay}>
            <Text style={styles.meterLabel}>Current Reading</Text>
            <Text style={styles.meterValue}>{currentMeter.toLocaleString()} <Text style={styles.unit}>hrs</Text></Text>
            <Text style={styles.lastSync}>Last synced: {lastSync}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.syncBtn, syncing && styles.syncBtnDisabled]} 
            onPress={handleSync} 
            disabled={syncing}
            activeOpacity={0.8}
          >
            {syncing ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh" size={20} color="#fff" />
              </Animated.View>
            ) : (
              <Ionicons name="cloud-download-outline" size={20} color="#fff" />
            )}
            <Text style={styles.syncBtnText}>
              {syncing ? 'Fetching from Device...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" style={{marginTop: 2}} />
          <Text style={styles.infoText}>
            Telematics devices automatically sync every 4 hours. Use this manual sync if you need the real-time reading for maintenance or check-out workflows.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 8, marginRight: 12, backgroundColor: '#F9FAFB', borderRadius: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  content: { padding: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 6px 10px rgba(0,0,0,0.05)' } as any
    })
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 10, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { fontSize: 12, color: '#059669', fontWeight: '500' },
  meterDisplay: { alignItems: 'center', marginVertical: 30 },
  meterLabel: { fontSize: 14, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  meterValue: { fontSize: 48, fontWeight: '800', color: '#111827', letterSpacing: -1 },
  unit: { fontSize: 24, color: '#9CA3AF', fontWeight: '600' },
  lastSync: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  syncBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#0EA5E9', paddingVertical: 16, borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#0EA5E9', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 6px rgba(14, 165, 233, 0.3)' } as any
    })
  },
  syncBtnDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0, elevation: 0, boxShadow: 'none' as any },
  syncBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  infoBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  infoText: { flex: 1, color: '#1E3A8A', fontSize: 14, lineHeight: 22, marginLeft: 12 }
});
