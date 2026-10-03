import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAlerts } from '../../../context/AlertsContext';
import { useAssignments } from '../../../context/AssignmentsContext';
import DateTimePickerModal from "react-native-modal-datetime-picker";
let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

const UNASSIGNED_DRIVERS = [
  { id: 'd1', name: 'Kwame Mensah', image: 'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=150&h=150&fit=crop', vehicle: 'Toyota Hilux (GT-2345-21)', role: 'Senior Driver' },
  { id: 'd2', name: 'Ama Osei', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1bf98a?w=150&h=150&fit=crop', vehicle: 'Ford Transit (GR-1092-19)', role: 'Delivery Driver' },
  { id: 'd3', name: 'Yaw Yeboah', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', vehicle: 'Hyundai H100 (GW-9942-20)', role: 'Cargo Driver' },
];

const getCoordinatesForLocation = (loc: string) => {
  if (!loc) return { latitude: 5.6037, longitude: -0.1870 };
  const l = loc.toLowerCase();
  if (l.includes('osu')) return { latitude: 5.556, longitude: -0.1810 };
  if (l.includes('accra') || l.includes('central')) return { latitude: 5.556, longitude: -0.2012 };
  if (l.includes('tema')) return { latitude: 5.6698, longitude: -0.0166 };
  if (l.includes('kumasi')) return { latitude: 6.6885, longitude: -1.6244 };
  if (l.includes('dansoman')) return { latitude: 5.5398, longitude: -0.2644 };
  if (l.includes('circle')) return { latitude: 5.5599, longitude: -0.2025 };
  if (l.includes('ashaiman')) return { latitude: 5.6980, longitude: -0.0340 };
  
  // Hash the string to get a somewhat deterministic fake coordinate near Accra
  let hash = 0;
  for (let i = 0; i < l.length; i++) hash = l.charCodeAt(i) + ((hash << 5) - hash);
  return { 
    latitude: 5.6037 + ((hash % 100) / 10000), 
    longitude: -0.1870 + (((hash >> 2) % 100) / 10000) 
  };
};

export default function NewAssignmentScreen() {
  const router = useRouter();
  const { addAlert } = useAlerts();
  const { addAssignment } = useAssignments();
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [vehicle, setVehicle] = useState('');
  
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisibility] = useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);

  const [notes, setNotes] = useState('');

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString() : 'Select Date';
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select Time';

  const handleSelectDriver = (driver: any) => {
    setSelectedDriver(driver);
    setVehicle(driver.vehicle);
    setShowDriverModal(false);
  };

  const handleSubmit = () => {
    if (!selectedDriver || !pickupLocation || !dropoffLocation || !date || !startTime || !endTime) {
      alert('Please fill out all fields.');
      return;
    }
    
    addAssignment({
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      pickupLocation,
      dropoffLocation,
      pickupCoords: getCoordinatesForLocation(pickupLocation),
      dropoffCoords: getCoordinatesForLocation(dropoffLocation),
      vehicle: selectedDriver.vehicle,
      date: date.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes,
    });

    addAlert(`New Assignment Created`, `You assigned ${selectedDriver?.name || 'a driver'} to ${pickupLocation} - ${dropoffLocation}.`, 'assignment');
    alert('Assignment sent to driver app successfully!');
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Create New Assignment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>Assign a route and vehicle to a driver.</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Driver</Text>
          <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowDriverModal(true)}>
            <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <Text style={[styles.input, { color: selectedDriver ? '#111827' : '#9CA3AF', paddingTop: Platform.OS === 'ios' ? 14 : 12 }]}>
              {selectedDriver ? selectedDriver.name : "Tap to select a driver"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Vehicle</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="car-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Ford Transit (XYZ-1234)"
              placeholderTextColor="#9CA3AF"
              value={vehicle}
              onChangeText={setVehicle}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Pickup Location</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Accra Central"
              placeholderTextColor="#9CA3AF"
              value={pickupLocation}
              onChangeText={setPickupLocation}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Drop-off Location</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Osu"
              placeholderTextColor="#9CA3AF"
              value={dropoffLocation}
              onChangeText={setDropoffLocation}
            />
          </View>
        </View>

        {pickupLocation.length > 0 && dropoffLocation.length > 0 && (
          <View style={styles.mapContainer}>
            <Text style={styles.label}>Route Preview</Text>
            <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
              <MapView 
                style={styles.mapPreview}
                initialRegion={{
                  latitude: (getCoordinatesForLocation(pickupLocation).latitude + getCoordinatesForLocation(dropoffLocation).latitude) / 2,
                  longitude: (getCoordinatesForLocation(pickupLocation).longitude + getCoordinatesForLocation(dropoffLocation).longitude) / 2,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                }}
              >
                <Marker coordinate={getCoordinatesForLocation(pickupLocation)} title="Pickup" description={pickupLocation} pinColor="green" />
                <Marker coordinate={getCoordinatesForLocation(dropoffLocation)} title="Drop-off" description={dropoffLocation} pinColor="red" />
                <Polyline 
                  coordinates={[getCoordinatesForLocation(pickupLocation), getCoordinatesForLocation(dropoffLocation)]} 
                  strokeColor="#059669" 
                  strokeWidth={3} 
                />
              </MapView>
            </View>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.inputWrapper} onPress={() => setDatePickerVisibility(true)}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <Text style={[styles.input, { color: date ? '#111827' : '#9CA3AF', paddingTop: Platform.OS === 'ios' ? 14 : 12 }]}>
              {formatDate(date)}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Time Window</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 8 }]} onPress={() => setStartTimePickerVisibility(true)}>
              <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <Text style={[styles.input, { color: startTime ? '#111827' : '#9CA3AF', paddingTop: Platform.OS === 'ios' ? 14 : 12, fontSize: 14 }]}>
                {formatTime(startTime)}
              </Text>
            </TouchableOpacity>
            
            <View style={{ justifyContent: 'center' }}><Text style={{ color: '#6B7280' }}>to</Text></View>
            
            <TouchableOpacity style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 8 }]} onPress={() => setEndTimePickerVisibility(true)}>
              <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.inputIcon} />
              <Text style={[styles.input, { color: endTime ? '#111827' : '#9CA3AF', paddingTop: Platform.OS === 'ios' ? 14 : 12, fontSize: 14 }]}>
                {formatTime(endTime)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Special Instructions (Optional)</Text>
          <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingVertical: 12 }]}>
            <TextInput
              style={[styles.input, { textAlignVertical: 'top' }]}
              placeholder="Add any notes for the driver..."
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Assign Driver</Text>
        </TouchableOpacity>
      </View>

      {/* Driver Selection Modal */}
      <Modal visible={showDriverModal} animationType="slide" transparent={true} onRequestClose={() => setShowDriverModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Driver</Text>
              <TouchableOpacity onPress={() => setShowDriverModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Available and unassigned drivers</Text>
            
            <ScrollView style={{ marginTop: 16 }}>
              {UNASSIGNED_DRIVERS.map(driver => (
                <TouchableOpacity key={driver.id} style={styles.driverItem} onPress={() => handleSelectDriver(driver)}>
                  <Image source={{ uri: driver.image }} style={styles.driverAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverNameModal}>{driver.name}</Text>
                    <Text style={styles.driverRoleModal}>{driver.role}</Text>
                  </View>
                  <View style={styles.driverVehicleBadge}>
                    <Ionicons name="car-outline" size={14} color="#043094" />
                    <Text style={styles.driverVehicleText}>{driver.vehicle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={(d) => { setDate(d); setDatePickerVisibility(false); }}
        onCancel={() => setDatePickerVisibility(false)}
      />
      <DateTimePickerModal
        isVisible={isStartTimePickerVisible}
        mode="time"
        onConfirm={(d) => { setStartTime(d); setStartTimePickerVisibility(false); }}
        onCancel={() => setStartTimePickerVisibility(false)}
      />
      <DateTimePickerModal
        isVisible={isEndTimePickerVisible}
        mode="time"
        onConfirm={(d) => { setEndTime(d); setEndTimePickerVisibility(false); }}
        onCancel={() => setEndTimePickerVisibility(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  content: { padding: 20 },
  description: { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 50 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%', outlineStyle: 'none' as any },
  footer: { flexDirection: 'row', backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginRight: 12 },
  cancelBtnText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  submitBtn: { flex: 2, backgroundColor: '#043094', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  modalSubtitle: { fontSize: 14, color: '#6B7280' },
  driverItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  driverAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 16, backgroundColor: '#E5E7EB' },
  driverNameModal: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  driverRoleModal: { fontSize: 13, color: '#6B7280' },
  driverVehicleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  driverVehicleText: { fontSize: 12, color: '#1E3A8A', fontWeight: '500' },
  mapContainer: { marginBottom: 20 },
  mapPreview: { width: '100%', height: 200 }
});
