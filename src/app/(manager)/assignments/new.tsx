import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAlerts } from '../../../context/AlertsContext';
import { useAssignments } from '../../../context/AssignmentsContext';
import { useTranslation } from 'react-i18next';
import { VehicleContext } from '../../../context/VehicleContext';

let DateTimePickerModal: any = null;
if (Platform.OS !== 'web') {
  DateTimePickerModal = require("react-native-modal-datetime-picker").default;
}

let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

import { supabase } from '../../../lib/supabase';

import { usePersonnel } from '../../../context/PersonnelContext';

// We will fetch drivers dynamically from the database now.

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
  const { t } = useTranslation();
  const { addAlert } = useAlerts();
  const { assignments, addAssignment } = useAssignments();
  const { personnel } = usePersonnel();
  
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showDriverModal, setShowDriverModal] = useState(false);

  const { vehicles } = React.useContext(VehicleContext);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
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

  const [pickupCoords, setPickupCoords] = useState({ latitude: 5.6037, longitude: -0.1870 });
  const [dropoffCoords, setDropoffCoords] = useState({ latitude: 5.6037, longitude: -0.1870 });
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);
  const [isPickupFocused, setIsPickupFocused] = useState(false);
  const [isDropoffFocused, setIsDropoffFocused] = useState(false);

  useEffect(() => {
    const fetchCoords = async (loc: string, setter: any, suggSetter: any) => {
      if (!loc || loc.length < 1) {
        setter(getCoordinatesForLocation(loc));
        suggSetter([]);
        return;
      }
      try {
        const query = loc;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=gh`, {
          headers: { 'User-Agent': 'AvianceFleetManager/1.0' }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          setter({ latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) });
          suggSetter(data);
        } else {
          setter(getCoordinatesForLocation(loc));
          suggSetter([]);
        }
      } catch (e) {
        setter(getCoordinatesForLocation(loc));
        suggSetter([]);
      }
    };

    const timeout = setTimeout(async () => {
      if (isPickupFocused) {
        await fetchCoords(pickupLocation, setPickupCoords, setPickupSuggestions);
      }
      if (isDropoffFocused) {
        await fetchCoords(dropoffLocation, setDropoffCoords, setDropoffSuggestions);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [pickupLocation, dropoffLocation, isPickupFocused, isDropoffFocused]);

  useEffect(() => {
    if (pickupCoords.latitude && dropoffCoords.latitude) {
      fetch(`https://router.project-osrm.org/route/v1/driving/${pickupCoords.longitude},${pickupCoords.latitude};${dropoffCoords.longitude},${dropoffCoords.latitude}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
            setRouteCoords(coords);
          } else {
            setRouteCoords([pickupCoords, dropoffCoords]);
          }
        })
        .catch(() => {
          setRouteCoords([pickupCoords, dropoffCoords]);
        });
    }
  }, [pickupCoords, dropoffCoords]);

  useEffect(() => {
    // Filter active drivers from personnel and check assignment status
    const formatted = personnel
      .filter(p => p.role === 'Driver' && p.status === 'Active')
      .map(d => {
        const isBusy = assignments.some(a => a.driverId === d.id && ['Pending', 'Accepted', 'In Progress'].includes(a.status));
        return {
          id: d.id,
          name: d.name,
          image: d.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(d.name) + '&background=043094&color=fff',
          vehicle: d.vehicle || 'Unassigned',
          role: 'Driver',
          availability: isBusy ? 'On Assignment' : 'Available',
          isBusy
        };
      });
    setAvailableDrivers(formatted);
  }, [personnel, assignments]);

  useEffect(() => {
    if (vehicles) {
      setAvailableVehicles(vehicles.filter((v: any) => v.status === 'Active' || v.status === 'Active'));
    }
  }, [vehicles]);

  const formatDate = (d: Date | null) => d ? d.toLocaleDateString() : t('assign_select_date', 'Select Date');
  const formatTime = (d: Date | null) => d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('assign_select_time', 'Select Time');

  const handleSelectDriver = (driver: any) => {
    setSelectedDriver(driver);
    
    // Auto-select their assigned vehicle if available
    if (vehicles) {
      const dVehicle = vehicles.find((v: any) => v.current_driver_id === driver.id || v.assignedTo === driver.name);
      if (dVehicle) {
        setSelectedVehicle(dVehicle);
      } else {
        setSelectedVehicle(null);
      }
    }
    setShowDriverModal(false);
  };

  const handleSubmit = () => {
    if (!selectedDriver || !pickupLocation || !dropoffLocation || !date || isNaN(date.getTime()) || !startTime || isNaN(startTime.getTime()) || !endTime || isNaN(endTime.getTime())) {
      alert(t('assign_error_fill', 'Please fill out all fields with valid dates and times.'));
      return;
    }
    
    addAssignment({
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      pickupLocation,
      dropoffLocation,
      pickupCoords,
      dropoffCoords,
      vehicle: selectedVehicle?.name || selectedVehicle?.make || selectedDriver.vehicle,
      vehicleId: selectedVehicle?.id,
      date: date.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes,
    });

    addAlert(t('assign_alert_title', 'New Assignment Created'), t('assign_alert_msg', 'You assigned {{driver}} to {{pickup}} - {{dropoff}}.', { driver: selectedDriver?.name || 'a driver', pickup: pickupLocation, dropoff: dropoffLocation }), 'assignment');
    alert(t('assign_success', 'Assignment sent to driver app successfully!'));
    if (router.canGoBack()) router.back();
    else router.replace('/(manager)/assignments');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(manager)/assignments')}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('assign_new_title', 'Create New Assignment')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>{t('assign_new_desc', 'Assign a route and vehicle to a driver.')}</Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('assign_lbl_driver', 'Select Driver')}</Text>
          <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowDriverModal(true)}>
            {selectedDriver ? (
              <Image source={{ uri: selectedDriver.image }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 12 }} />
            ) : (
              <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            )}
            <Text style={[styles.inputText, { color: selectedDriver ? '#111827' : '#9CA3AF', fontWeight: selectedDriver ? '600' : '400' }]}>
              {selectedDriver ? selectedDriver.name : t('assign_ph_driver', 'Tap to select a driver')}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('assign_lbl_vehicle', 'Select Vehicle')}</Text>
          <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowVehicleModal(true)}>
            {selectedVehicle ? (
              <Image source={{ uri: selectedVehicle.image }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 12, backgroundColor: '#E5E7EB' }} />
            ) : (
              <Ionicons name="car-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            )}
            <Text style={[styles.inputText, { color: selectedVehicle ? '#111827' : '#9CA3AF', fontWeight: selectedVehicle ? '600' : '400' }]}>
              {selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} - ${selectedVehicle.plate}` : t('assign_ph_vehicle', 'Tap to select a vehicle')}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, zIndex: 10 }}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>{t('assign_lbl_pickup', 'Pickup Location')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('assign_ph_pickup', 'e.g. Accra Central')}
                placeholderTextColor="#9CA3AF"
                value={pickupLocation}
                onChangeText={setPickupLocation}
                onFocus={() => setIsPickupFocused(true)}
                onBlur={() => setTimeout(() => setIsPickupFocused(false), 200)}
              />
            </View>
            {isPickupFocused && pickupSuggestions.length > 0 && (
              <ScrollView style={styles.suggestionsDropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {pickupSuggestions.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => {
                    setPickupLocation(s.display_name);
                    setPickupCoords({ latitude: parseFloat(s.lat), longitude: parseFloat(s.lon) });
                    setIsPickupFocused(false);
                  }}>
                    <Text numberOfLines={2} style={styles.suggestionText}>{s.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>{t('assign_lbl_dropoff', 'Drop-off Location')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('assign_ph_dropoff', 'e.g. Osu')}
                placeholderTextColor="#9CA3AF"
                value={dropoffLocation}
                onChangeText={setDropoffLocation}
                onFocus={() => setIsDropoffFocused(true)}
                onBlur={() => setTimeout(() => setIsDropoffFocused(false), 200)}
              />
            </View>
            {isDropoffFocused && dropoffSuggestions.length > 0 && (
              <ScrollView style={styles.suggestionsDropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {dropoffSuggestions.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => {
                    setDropoffLocation(s.display_name);
                    setDropoffCoords({ latitude: parseFloat(s.lat), longitude: parseFloat(s.lon) });
                    setIsDropoffFocused(false);
                  }}>
                    <Text numberOfLines={2} style={styles.suggestionText}>{s.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {pickupLocation.length > 0 && dropoffLocation.length > 0 && (
          <View style={styles.mapContainer}>
            <Text style={styles.label}>{t('assign_route_preview', 'Route Preview')}</Text>
            <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              {Platform.OS === 'web' ? (() => {
                const p = pickupCoords;
                const d = dropoffCoords;
                const srcDoc = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style> body { margin: 0; padding: 0; } #map { width: 100vw; height: 100vh; } </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      var map = L.map('map');
                      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                      var p1 = [${p.latitude}, ${p.longitude}];
                      var p2 = [${d.latitude}, ${d.longitude}];
                      
                      var greenIcon = new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                      });
                      var redIcon = new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                      });

                      L.marker(p1, {icon: greenIcon}).addTo(map).bindPopup("Pickup");
                      L.marker(p2, {icon: redIcon}).addTo(map).bindPopup("Drop-off");
                      
                      fetch('https://router.project-osrm.org/route/v1/driving/' + ${p.longitude} + ',' + ${p.latitude} + ';' + ${d.longitude} + ',' + ${d.latitude} + '?overview=full&geometries=geojson')
                        .then(res => res.json())
                        .then(data => {
                          var coords = [p1, p2];
                          if(data.routes && data.routes[0]) {
                            coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                          }
                          var polyline = L.polyline(coords, {color: '#059669', weight: 4}).addTo(map);
                          setTimeout(function(){ 
                            map.invalidateSize(); 
                            map.fitBounds(polyline.getBounds(), { padding: [30, 30] }); 
                          }, 400);
                        })
                        .catch(() => {
                          var polyline = L.polyline([p1, p2], {color: '#059669', weight: 4}).addTo(map);
                          setTimeout(function(){ 
                            map.invalidateSize(); 
                            map.fitBounds(polyline.getBounds(), { padding: [30, 30] }); 
                          }, 400);
                        });
                    </script>
                  </body>
                  </html>
                `;
                return React.createElement('iframe', {
                  srcDoc,
                  width: '100%',
                  height: '220',
                  frameBorder: '0',
                  style: { border: 0 }
                });
              })() : (
                <MapView 
                  style={styles.mapPreview}
                  region={{
                    latitude: (pickupCoords.latitude + dropoffCoords.latitude) / 2,
                    longitude: (pickupCoords.longitude + dropoffCoords.longitude) / 2,
                    latitudeDelta: Math.max(Math.abs(pickupCoords.latitude - dropoffCoords.latitude) * 2, 0.1),
                    longitudeDelta: Math.max(Math.abs(pickupCoords.longitude - dropoffCoords.longitude) * 2, 0.1),
                  }}
                >
                  <Marker coordinate={pickupCoords} title={t('assign_pickup', 'Pickup')} description={pickupLocation} pinColor="green" />
                  <Marker coordinate={dropoffCoords} title={t('assign_dropoff', 'Drop-off')} description={dropoffLocation} pinColor="red" />
                  <Polyline 
                    coordinates={routeCoords.length > 0 ? routeCoords : [pickupCoords, dropoffCoords]} 
                    strokeColor="#059669" 
                    strokeWidth={4} 
                  />
                </MapView>
              )}
            </View>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('assign_lbl_date', 'Date')}</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              {React.createElement('input', {
                type: 'date',
                value: (date && !isNaN(date.getTime())) ? date.toISOString().split('T')[0] : '',
                onChange: (e: any) => setDate(e.target.value ? new Date(e.target.value) : null),
                onClick: (e: any) => e.target.showPicker && e.target.showPicker(),
                style: { flex: 1, border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: 16, color: '#111827' }
              })}
            </View>
          ) : (
            <TouchableOpacity style={styles.inputWrapper} onPress={() => setDatePickerVisibility(true)}>
              <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <Text style={[styles.inputText, { color: date ? '#111827' : '#9CA3AF' }]}>
                {formatDate(date)}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('assign_lbl_time', 'Time Window')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {Platform.OS === 'web' ? (
              <View style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 12 }]}>
                <Ionicons name="time-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                {React.createElement('input', {
                  type: 'time',
                  value: (startTime && !isNaN(startTime.getTime())) ? startTime.toTimeString().slice(0, 5) : '',
                  onChange: (e: any) => {
                    if(e.target.value) {
                      const [h, m] = e.target.value.split(':');
                      const d = new Date();
                      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                      setStartTime(d);
                    } else setStartTime(null);
                  },
                  onClick: (e: any) => e.target.showPicker && e.target.showPicker(),
                  style: { flex: 1, border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: 14, color: '#111827' }
                })}
              </View>
            ) : (
              <TouchableOpacity style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 12 }]} onPress={() => setStartTimePickerVisibility(true)}>
                <Ionicons name="time-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <Text style={[styles.inputText, { color: startTime ? '#111827' : '#9CA3AF', fontSize: 14 }]}>
                  {formatTime(startTime)}
                </Text>
              </TouchableOpacity>
            )}
            
            <View style={{ justifyContent: 'center' }}><Text style={{ color: '#6B7280', fontWeight: '500' }}>{t('assign_to', 'to')}</Text></View>
            
            {Platform.OS === 'web' ? (
              <View style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 12 }]}>
                <Ionicons name="time-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                {React.createElement('input', {
                  type: 'time',
                  value: (endTime && !isNaN(endTime.getTime())) ? endTime.toTimeString().slice(0, 5) : '',
                  onChange: (e: any) => {
                    if(e.target.value) {
                      const [h, m] = e.target.value.split(':');
                      const d = new Date();
                      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                      setEndTime(d);
                    } else setEndTime(null);
                  },
                  onClick: (e: any) => e.target.showPicker && e.target.showPicker(),
                  style: { flex: 1, border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: 14, color: '#111827' }
                })}
              </View>
            ) : (
              <TouchableOpacity style={[styles.inputWrapper, { flex: 1, paddingHorizontal: 12 }]} onPress={() => setEndTimePickerVisibility(true)}>
                <Ionicons name="time-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <Text style={[styles.inputText, { color: endTime ? '#111827' : '#9CA3AF', fontSize: 14 }]}>
                  {formatTime(endTime)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('assign_lbl_notes', 'Special Instructions (Optional)')}</Text>
          <View style={[styles.inputWrapper, { height: 120, alignItems: 'flex-start', paddingVertical: 16 }]}>
            <TextInput
              style={[styles.input, { textAlignVertical: 'top' }]}
              placeholder={t('assign_ph_notes', 'Add any notes for the driver...')}
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
          <Text style={styles.cancelBtnText}>{t('common_cancel', 'Cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>{t('assign_submit', 'Assign Driver')}</Text>
        </TouchableOpacity>
      </View>

      {/* Driver Selection Modal */}
      <Modal visible={showDriverModal} animationType="slide" transparent={true} onRequestClose={() => setShowDriverModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('assign_select_driver', 'Select Driver')}</Text>
              <TouchableOpacity onPress={() => setShowDriverModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t('assign_avail_drivers', 'Available and unassigned drivers')}</Text>
            
            <ScrollView style={{ marginTop: 24, maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {availableDrivers.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 30 }}>
                  <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                  <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 12, fontSize: 16 }}>No available drivers found.</Text>
                </View>
              ) : (
                availableDrivers.map(driver => (
                  <TouchableOpacity 
                    key={driver.id} 
                    style={[styles.driverItem, selectedDriver?.id === driver.id && styles.driverItemSelected]} 
                    onPress={() => handleSelectDriver(driver)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: driver.image }} style={styles.driverAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverNameModal}>{driver.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                        <View style={[styles.driverVehicleBadge, { backgroundColor: '#F3F4F6' }]}>
                          <Ionicons name="car-outline" size={14} color="#4B5563" />
                          <Text style={[styles.driverVehicleText, { color: '#4B5563' }]} numberOfLines={1}>{driver.vehicle}</Text>
                        </View>
                        <View style={[styles.driverVehicleBadge, { backgroundColor: driver.isBusy ? '#FEF2F2' : '#ECFDF5' }]}>
                          <Ionicons name={driver.isBusy ? "time-outline" : "checkmark-circle"} size={14} color={driver.isBusy ? "#EF4444" : "#10B981"} />
                          <Text style={[styles.driverVehicleText, { color: driver.isBusy ? "#EF4444" : "#10B981" }]}>{driver.availability}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.driverSelectIcon}>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Vehicle Selection Modal */}
      <Modal visible={showVehicleModal} animationType="slide" transparent={true} onRequestClose={() => setShowVehicleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('assign_select_vehicle', 'Select Vehicle')}</Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t('assign_avail_vehicles', 'Available vehicles in fleet')}</Text>
            
            <ScrollView style={{ marginTop: 24, maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {availableVehicles.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 30 }}>
                  <Ionicons name="car-outline" size={48} color="#D1D5DB" />
                  <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 12, fontSize: 16 }}>No active vehicles found.</Text>
                </View>
              ) : (
                availableVehicles.map(v => (
                  <TouchableOpacity 
                    key={v.id} 
                    style={[styles.driverItem, selectedVehicle?.id === v.id && styles.driverItemSelected]} 
                    onPress={() => {
                      setSelectedVehicle(v);
                      
                      // Auto-select the driver assigned to this vehicle
                      if (v.current_driver_id || v.assignedTo) {
                        const assignedDriver = availableDrivers.find(d => d.id === v.current_driver_id || d.name === v.assignedTo);
                        if (assignedDriver) {
                          setSelectedDriver(assignedDriver);
                        }
                      }
                      
                      setShowVehicleModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: v.image }} style={styles.driverAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverNameModal}>{v.make} {v.model}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                        <View style={[styles.driverVehicleBadge, { backgroundColor: '#F3F4F6' }]}>
                          <Ionicons name="card-outline" size={14} color="#4B5563" />
                          <Text style={[styles.driverVehicleText, { color: '#4B5563' }]} numberOfLines={1}>{v.plate}</Text>
                        </View>
                        {v.assignedTo && (
                          <View style={[styles.driverVehicleBadge, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="person-outline" size={14} color="#10B981" />
                            <Text style={[styles.driverVehicleText, { color: '#10B981' }]} numberOfLines={1}>{v.assignedTo}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.driverSelectIcon}>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {Platform.OS !== 'web' && (
        <>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={(d: Date) => { setDate(d); setDatePickerVisibility(false); }}
            onCancel={() => setDatePickerVisibility(false)}
          />
          <DateTimePickerModal
            isVisible={isStartTimePickerVisible}
            mode="time"
            onConfirm={(d: Date) => { setStartTime(d); setStartTimePickerVisibility(false); }}
            onCancel={() => setStartTimePickerVisibility(false)}
          />
          <DateTimePickerModal
            isVisible={isEndTimePickerVisible}
            mode="time"
            onConfirm={(d: Date) => { setEndTime(d); setEndTimePickerVisibility(false); }}
            onCancel={() => setEndTimePickerVisibility(false)}
          />
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 24, paddingTop: Platform.OS === 'ios' ? 50 : 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  content: { padding: 24 },
  description: { fontSize: 16, color: '#6B7280', marginBottom: 28, lineHeight: 24 },
  formGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', height: '100%', outlineStyle: 'none' as any },
  inputText: { flex: 1, fontSize: 16, color: '#111827' },
  footer: { flexDirection: 'row', backgroundColor: '#fff', padding: 24, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginRight: 16 },
  cancelBtnText: { color: '#4B5563', fontSize: 16, fontWeight: '700' },
  submitBtn: { flex: 2, backgroundColor: '#043094', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#043094', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end', alignItems: Platform.OS === 'web' ? 'center' : 'stretch' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderRadius: Platform.OS === 'web' ? 28 : 0, padding: 24, maxHeight: '85%', width: Platform.OS === 'web' ? 500 : '100%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  modalSubtitle: { fontSize: 16, color: '#6B7280' },
  driverItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  driverItemSelected: { borderColor: '#043094', backgroundColor: '#F8FAFC', borderWidth: 2 },
  driverAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16, backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#fff' },
  driverNameModal: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  driverRoleModal: { fontSize: 14, color: '#6B7280' },
  driverVehicleBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
  driverVehicleText: { fontSize: 12, fontWeight: '600', maxWidth: 120 },
  driverSelectIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  mapContainer: { marginBottom: 24, zIndex: 1 },
  mapPreview: { width: '100%', height: 220 },
  suggestionsDropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 4, maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, position: 'absolute', top: 76, left: 0, right: 0, zIndex: 1000 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionText: { fontSize: 13, color: '#374151', lineHeight: 18 }
});
