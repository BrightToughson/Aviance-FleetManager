import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleClose = () => {
    // Explicitly navigate back to equipments page
    router.navigate('/(manager)/equipments');
  };

  const handleBarCodeScanned = ({ type, data }: any) => {
    setScanned(true);
    Alert.alert(
      "Equipment Scanned",
      `Barcode Data: ${data}\n\nIn a real app, this would instantly open the equipment profile.`,
      [
        { text: "OK", onPress: () => setScanned(false) }
      ]
    );
  };

  if (Platform.OS !== 'web') {
    if (!permission) {
      return <View style={styles.center}><Text>Loading camera permissions...</Text></View>;
    }
    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <Text style={{ marginBottom: 15, fontSize: 16 }}>We need camera access to scan equipment QR codes.</Text>
          <TouchableOpacity 
            onPress={() => {
              if (permission.canAskAgain) {
                requestPermission();
              } else {
                Linking.openSettings();
              }
            }} 
            style={styles.btn}
          >
            <Text style={styles.btnText}>
              {permission.canAskAgain ? 'Grant Permission' : 'Open Settings'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={[styles.btn, { marginTop: 15, backgroundColor: '#6B7280' }]}>
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Ionicons name="qr-code-outline" size={100} color="#D1D5DB" />
          <Text style={styles.webFallbackText}>Camera not supported on Web Simulator.</Text>
          <TouchableOpacity 
            style={styles.mockScanBtn} 
            onPress={() => handleBarCodeScanned({ type: 'mock', data: 'EQ-0001-DEMO' })}
          >
            <Text style={styles.mockScanText}>Simulate Successful Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={[styles.btn, { marginTop: 20, backgroundColor: '#EF4444' }]}>
            <Text style={styles.btnText}>Close Scanner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill as any}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={[StyleSheet.absoluteFill, styles.overlay, { zIndex: 10 }]}>
            <View style={styles.scanTarget} />
            <Text style={styles.scanText}>Align QR code within the frame to scan</Text>
            <TouchableOpacity onPress={handleClose} style={styles.cancelScanBtn}>
              <Text style={styles.btnText}>Cancel Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan Equipment QR</Text>
        <View style={{ width: 28 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { position: 'absolute', top: 50, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  scanTarget: { width: 250, height: 250, borderWidth: 2, borderColor: '#0EA5E9', backgroundColor: 'transparent', borderRadius: 12 },
  scanText: { color: '#fff', marginTop: 30, fontSize: 16 },
  webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  webFallbackText: { color: '#9CA3AF', marginTop: 20, fontSize: 16 },
  mockScanBtn: { marginTop: 30, backgroundColor: '#0EA5E9', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  mockScanText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelScanBtn: { marginTop: 40, backgroundColor: '#EF4444', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 8 },
});
