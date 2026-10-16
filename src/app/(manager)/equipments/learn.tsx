import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function EquipmentsLearnScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Equipment Guide</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.heading}>How to manage Company Equipment</Text>
        <Text style={styles.paragraph}>
          The Equipments page allows you to track and manage small or heavy machinery, tools, generators, and other non-vehicle assets. Here is what you can do:
        </Text>

        <View style={styles.section}>
          <Ionicons name="log-out-outline" size={24} color="#043094" />
          <View style={styles.textBlock}>
            <Text style={styles.subheading}>Check-out System</Text>
            <Text style={styles.paragraph}>Unlike vehicles which are assigned permanently, equipment is checked out and returned. Click the 3-dot menu icon on any available equipment and select "Check Out" to hand it over to someone.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Ionicons name="person-outline" size={24} color="#043094" />
          <View style={styles.textBlock}>
            <Text style={styles.subheading}>Manual Entry (Contractors)</Text>
            <Text style={styles.paragraph}>If someone checking out equipment does not have an app account (like an external contractor or day laborer), you can use the "Manual Entry" toggle during Checkout to simply type their name.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Ionicons name="log-in-outline" size={24} color="#043094" />
          <View style={styles.textBlock}>
            <Text style={styles.subheading}>Returning Equipment</Text>
            <Text style={styles.paragraph}>When an item is brought back to the warehouse, click the 3-dot menu and select "Return Equipment". This marks it as "Available" for the next person.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Ionicons name="search" size={24} color="#043094" />
          <View style={styles.textBlock}>
            <Text style={styles.subheading}>Search & Filters</Text>
            <Text style={styles.paragraph}>Use the tabs (All, Checked Out, Available) to quickly filter the list. You can also search by equipment name, serial number, or make to find specific items instantly.</Text>
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
