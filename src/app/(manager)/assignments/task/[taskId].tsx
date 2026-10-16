import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAssignments } from '../../../../context/AssignmentsContext';
import { useTranslation } from 'react-i18next';
let MapView: any = View;
let Marker: any = View;
let Polyline: any = View;
const WebIframe: any = Platform.OS === 'web' ? (props: any) => React.createElement('iframe', props) : () => null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { assignments, deleteAssignment } = useAssignments();

  // Try to find the assignment in the context first
  const contextTask = assignments.find(a => a.id === taskId);

  if (!contextTask) {
    return <View style={styles.container}><Text style={{padding:20}}>{t('common_loading', 'Loading...')}</Text></View>;
  }

  const task = {
    id: contextTask.id,
    date: new Date(contextTask.date).toLocaleDateString(),
    pickup: contextTask.pickupLocation,
    dropoff: contextTask.dropoffLocation,
    pickupCoords: contextTask.pickupCoords || { latitude: 5.556, longitude: -0.2012 },
    dropoffCoords: contextTask.dropoffCoords || { latitude: 5.560, longitude: -0.1810 },
    driverCoords: contextTask.driverCoords,
    time: `${new Date(contextTask.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(contextTask.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    status: contextTask.status,
    stops: 2,
    completedStops: contextTask.status === 'Completed' ? 2 : 0,
    vehicle: contextTask.vehicle,
    driverName: contextTask.driverName,
    notes: contextTask.notes || t('assign_no_notes', 'No special instructions provided.'),
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  let progressPercentage = 0;
  let currentDistFormatted = "0";
  let totalDistFormatted = "0";

  if (task.pickupCoords && task.dropoffCoords) {
    const totalDist = calculateDistance(task.pickupCoords.latitude, task.pickupCoords.longitude, task.dropoffCoords.latitude, task.dropoffCoords.longitude);
    totalDistFormatted = totalDist.toFixed(1);
    
    if (task.status === 'Completed') {
      progressPercentage = 100;
      currentDistFormatted = totalDistFormatted;
    } else if (task.status === 'In Progress') {
      // Simulate moving a little bit if we don't have driverCoords (for demonstration), otherwise use real coords
      let currentDist = totalDist * 0.1; // 10% mock if no real GPS
      if (task.driverCoords) {
        currentDist = calculateDistance(task.pickupCoords.latitude, task.pickupCoords.longitude, task.driverCoords.latitude, task.driverCoords.longitude);
      }
      currentDistFormatted = currentDist.toFixed(1);
      if (totalDist > 0) {
        progressPercentage = Math.min(100, Math.max(0, (currentDist / totalDist) * 100));
      }
    }
  }

  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);

  useEffect(() => {
    if (task?.pickupCoords && task?.dropoffCoords) {
      fetch(`https://router.project-osrm.org/route/v1/driving/${task.pickupCoords.longitude},${task.pickupCoords.latitude};${task.dropoffCoords.longitude},${task.dropoffCoords.latitude}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
            setRouteCoords(coords);
          } else {
            setRouteCoords([task.pickupCoords, task.dropoffCoords]);
          }
        })
        .catch(() => {
          setRouteCoords([task.pickupCoords, task.dropoffCoords]);
        });
    }
  }, [task?.pickupCoords, task?.dropoffCoords]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'Completed': return { bg: '#D1FAE5', text: '#059669' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backBtnText}>{t('common_back', 'Back')}</Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status).bg }]}>
          <Text style={[styles.statusText, { color: getStatusColor(task.status).text }]}>{t(`assign_status_${task.status.toLowerCase().replace(' ', '_')}`, task.status)}</Text>
        </View>
      </View>

      <Text style={styles.pageTitle}>{t('assign_task_details', 'Task Details')}</Text>

      <View style={styles.card}>
        {Platform.OS === 'web' ? (() => {
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
                var p1 = [${task.pickupCoords.latitude}, ${task.pickupCoords.longitude}];
                var p2 = [${task.dropoffCoords.latitude}, ${task.dropoffCoords.longitude}];
                
                var blueIcon = new L.Icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                });
                var greenIcon = new L.Icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                });
                var blackIcon = new L.Icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                });

                L.marker(p1, {icon: blueIcon}).addTo(map).bindPopup("Pickup");
                L.marker(p2, {icon: greenIcon}).addTo(map).bindPopup("Drop-off");
                
                var driverLat = ${task.driverCoords?.latitude || 'null'};
                var driverLng = ${task.driverCoords?.longitude || 'null'};
                if (driverLat && driverLng) {
                  L.marker([driverLat, driverLng], {icon: blackIcon}).addTo(map).bindPopup("Driver Location");
                }
                
                fetch('https://router.project-osrm.org/route/v1/driving/' + p1[1] + ',' + p1[0] + ';' + p2[1] + ',' + p2[0] + '?overview=full&geometries=geojson')
                  .then(res => res.json())
                  .then(data => {
                    var coords = [p1, p2];
                    if(data.routes && data.routes[0]) {
                      coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    }
                    var polyline = L.polyline(coords, {color: '#043094', weight: 4}).addTo(map);
                    setTimeout(function(){ map.invalidateSize(); map.fitBounds(polyline.getBounds(), { padding: [30, 30] }); }, 400);
                  })
                  .catch(() => {
                    var polyline = L.polyline([p1, p2], {color: '#043094', weight: 4}).addTo(map);
                    setTimeout(function(){ map.invalidateSize(); map.fitBounds(polyline.getBounds(), { padding: [30, 30] }); }, 400);
                  });
              </script>
            </body>
            </html>
          `;
          return (
            <WebIframe 
              srcDoc={srcDoc} 
              width="100%" 
              height="200" 
              style={{ border: 0, height: 200, width: '100%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }} 
            />
          );
        })() : (
          <MapView 
            style={styles.mapPreview}
            initialRegion={{
              latitude: (task.pickupCoords.latitude + task.dropoffCoords.latitude) / 2,
              longitude: (task.pickupCoords.longitude + task.dropoffCoords.longitude) / 2,
              latitudeDelta: Math.max(Math.abs(task.pickupCoords.latitude - task.dropoffCoords.latitude) * 2, 0.05),
              longitudeDelta: Math.max(Math.abs(task.pickupCoords.longitude - task.dropoffCoords.longitude) * 2, 0.05),
            }}
          >
            <Marker coordinate={task.pickupCoords} title={t('assign_pickup', 'Pickup')} description={task.pickup} pinColor="#043094" />
            <Marker coordinate={task.dropoffCoords} title={t('assign_dropoff', 'Drop-off')} description={task.dropoff} pinColor="#10B981" />
            
            {task.driverCoords && (
              <Marker coordinate={task.driverCoords} title="Driver Location" pinColor="#111827" />
            )}
            {task.driverCoords && (
              <Polyline 
                coordinates={[task.driverCoords, task.pickupCoords]} 
                strokeColor="#6B7280" 
                strokeWidth={2} 
                lineDashPattern={[5, 5]}
              />
            )}

            <Polyline 
              coordinates={routeCoords.length > 0 ? routeCoords : [task.pickupCoords, task.dropoffCoords]} 
              strokeColor="#043094" 
              strokeWidth={4} 
            />
          </MapView>
        )}
        <View style={styles.cardContent}>
          <View style={styles.routeHeader}>
            <Ionicons name="map" size={24} color="#059669" />
            <Text style={styles.routeTitle}>{task.pickup} to {task.dropoff}</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>{t('assign_lbl_date', 'Date')}</Text>
                <Text style={styles.infoValue}>{task.date}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>{t('assign_lbl_time', 'Time Window')}</Text>
                <Text style={styles.infoValue}>{task.time}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="car-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>{t('assign_lbl_assigned_veh', 'Assigned Vehicle')}</Text>
                <Text style={styles.infoValue}>{task.vehicle}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="person-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <View>
                <Text style={styles.infoLabel}>{t('assign_lbl_driver_only', 'Driver')}</Text>
                <Text style={styles.infoValue}>{task.driverName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>{t('assign_route_progress', 'Route Progress')}</Text>
              <Text style={styles.progressValue}>{currentDistFormatted} km / {totalDistFormatted} km</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercentage}%`, backgroundColor: task.status === 'Completed' ? '#059669' : '#1D4ED8' }]} />
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('assign_notes_inst', 'Notes & Instructions')}</Text>
      <View style={styles.notesCard}>
        <Ionicons name="document-text-outline" size={24} color="#D97706" />
        <Text style={styles.notesText}>{task.notes}</Text>
      </View>

      <TouchableOpacity 
        style={styles.deleteBtn} 
        onPress={() => {
          if (window.confirm(t('assign_delete_confirm', 'Are you sure you want to delete this assignment?'))) {
            deleteAssignment(task.id);
            router.replace('/(manager)/assignments');
          }
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#DC2626" />
        <Text style={styles.deleteBtnText}>{t('assign_delete_btn', 'Delete Assignment')}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  contentContainer: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerRowMobile: { paddingBottom: 10 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 24 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', marginBottom: 32 },
  mapPreview: { width: '100%', height: 200, backgroundColor: '#E5E7EB' },
  cardContent: { padding: 24 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  routeTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, marginBottom: 32 },
  infoItem: { flexDirection: 'row', width: 200, alignItems: 'flex-start' },
  infoIcon: { marginTop: 2, marginRight: 12 },
  infoLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  
  progressContainer: { marginTop: 10 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 15, color: '#4B5563', fontWeight: '500' },
  progressValue: { fontSize: 15, color: '#111827', fontWeight: '700' },
  progressBarBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  notesCard: { backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FEF3C7', padding: 20, flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginBottom: 32 },
  notesText: { fontSize: 15, color: '#92400E', lineHeight: 24, flex: 1, fontWeight: '500' },
  
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEE2E2', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5' },
  deleteBtnText: { color: '#DC2626', fontSize: 16, fontWeight: 'bold' }
});
