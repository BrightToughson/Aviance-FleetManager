import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function VehiclesLearnScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Vehicles Guide</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.heading}>How to use the Vehicles Page</Text>
        <Text style={styles.paragraph}>
          The Vehicles page is your central hub for managing the entire fleet. Here is a breakdown of what you can do:
        </Text>

        <View style={styles.section}>
          <Ionicons name="search" size={24} color="#043094" />
          <View style={styles.textBlock}>
            <Text style={styles.subheading}>Search & Filter</Text>
            <Text style={styles.paragraph}>Use the search bar to instantly find vehicles by their Name, Make, Model, or VIN. Click the &quot;Filters&quot; button to narrow down the list by specific manufacturers.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Ionicons name="ellipsis-vertical" size={24} color="#043094" />
          <View style={styles.textBlock}>
            <Text style={styles.subheading}>Assigning Drivers</Text>
            <Text style={styles.paragraph}>Click the 3-dot menu icon on the far right of any vehicle in the list to Assign, Reassign, or Remove a driver from that specific vehicle.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Ionicons name="map-outline" size={24} color="#043094" />
          <View style={styles.textBlock}>
            <Text style={styles.subheading}>Live Map & Tracking</Text>
            <Text style={styles.paragraph}>Click the Map icon at the top right to view the real-time GPS location of all active vehicles currently out on jobs.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Ionicons name="qr-code-outline" size={24} color="#043094" />
          <View style={styles.textBlock}>
            <Text style={styles.subheading}>QR Scanning</Text>
            <Text style={styles.paragraph}>Click the QR code icon to open your camera. Scanning a vehicle&apos;s barcode will instantly pull up its maintenance history and current assigned driver.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8, marginRight: 12, backgroundColor: '#F3F4F6', borderRadius: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  content: { padding: 20 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  paragraph: { fontSize: 16, color: '#4B5563', lineHeight: 24, marginBottom: 20 },
  section: { flexDirection: 'row', backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  textBlock: { marginLeft: 15, flex: 1 },
  subheading: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
});
