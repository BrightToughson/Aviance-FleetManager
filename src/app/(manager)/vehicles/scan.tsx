import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useVehicles } from '../../../context/VehicleContext';
import { supabase } from '../../../lib/supabase';

// Smart license plate extractor from OCR raw text
function extractLicensePlate(rawText: string, knownPlates: string[] = []): string | null {
  if (!rawText) return null;
  const clean = rawText.toUpperCase();

  // 1. Direct match with any known plate in the manager's fleet
  for (const p of knownPlates) {
    if (!p) continue;
    const normP = p.replace(/[^A-Z0-9]/g, '');
    const normText = clean.replace(/[^A-Z0-9]/g, '');
    if (normP.length >= 3 && normText.includes(normP)) {
      return p;
    }
  }

  // 2. Standard Ghanaian / African format: 2-3 letters, 1-4 numbers, 2 numbers (e.g. "GR-293-24", "GT 4022 21", "AS-1234-20")
  const ghanaMatch = clean.match(/\b([A-Z]{2,3})[- \s]?([0-9]{1,4})[- \s]?([0-9]{2})\b/);
  if (ghanaMatch) {
    return `${ghanaMatch[1]}-${ghanaMatch[2]}-${ghanaMatch[3]}`;
  }

  // 3. Hyphenated 2-group formats: e.g. "ABC-1234", "123-ABC"
  const generalMatch = clean.match(/\b([A-Z0-9]{2,4})[-]([A-Z0-9]{2,5})\b/);
  if (generalMatch) {
    return `${generalMatch[1]}-${generalMatch[2]}`;
  }

  // 4. Any alphanumeric block between 4 and 10 characters with both letters and numbers
  const tokens = clean.split(/[\s\n\r,.:;]+/).map(t => t.replace(/[^A-Z0-9-]/g, '')).filter(t => t.length >= 4 && t.length <= 10);
  for (const t of tokens) {
    if (/[A-Z]/.test(t) && /[0-9]/.test(t)) {
      return t;
    }
  }

  // 5. Fallback: longest alphanumeric line
  const lines = clean.split(/[\n\r]+/).map(l => l.replace(/[^A-Z0-9-]/g, '').trim()).filter(l => l.length >= 4);
  if (lines.length > 0) {
    return lines[0];
  }

  return null;
}

export default function LicensePlateLookupScreen() {
  const router = useRouter();
  const { vehicles } = useVehicles();
  const [permission, requestPermission] = useCameraPermissions();

  // Mode: 'manual' (type plate) vs 'camera' (scan plate)
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');
  const [plateInput, setPlateInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedPlate, setSearchedPlate] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [foundVehicle, setFoundVehicle] = useState<any | null>(null);

  // Web Camera & OCR State
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const fileInputRef = useRef<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);

  const handleClose = () => {
    stopWebCamera();
    router.navigate('/(manager)/vehicles');
  };

  const normalize = (val: string) => {
    return (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const performSearch = async (plateToSearch: string) => {
    const cleanQuery = plateToSearch.trim();
    if (!cleanQuery) return;

    setIsSearching(true);
    setSearchedPlate(cleanQuery.toUpperCase());
    setFoundVehicle(null);

    const normQuery = normalize(cleanQuery);

    // 1. Check in loaded context
    const localMatch = vehicles.find((v: any) => {
      const p = normalize(v.plate || v.license_plate);
      const vin = normalize(v.vin);
      return p === normQuery || vin === normQuery;
    });

    if (localMatch) {
      setFoundVehicle(localMatch);
      setSearchStatus('found');
      setIsSearching(false);
      return;
    }

    // 2. Query Supabase directly
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          profiles:profiles!vehicles_current_driver_id_fkey (full_name)
        `)
        .or(`license_plate.ilike.%${cleanQuery}%,vin.ilike.%${cleanQuery}%`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const v = data[0];
        const formatted = {
          ...v,
          assignedTo: v.profiles?.full_name || null,
          image: v.image_url || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=150&h=150',
          group: v.vehicle_group || 'Unassigned',
          meter: v.current_meter || '0',
          plate: v.license_plate,
          status: v.status === 'out_of_service' ? 'Out of Service' : 
                  v.status === 'maintenance' ? 'In Shop' : 'Active'
        };
        setFoundVehicle(formatted);
        setSearchStatus('found');
      } else {
        setSearchStatus('not_found');
      }
    } catch (err) {
      console.error('Error searching vehicle:', err);
      setSearchStatus('not_found');
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = () => {
    if (!plateInput.trim()) return;
    performSearch(plateInput);
  };

  const handleResetSearch = () => {
    setSearchStatus('idle');
    setFoundVehicle(null);
    setSearchedPlate(null);
    setPlateInput('');
    setScannedImagePreview(null);
    setOcrStatusText('');
  };

  const handleBarCodeScanned = ({ data }: any) => {
    if (data) {
      stopWebCamera();
      setMode('manual');
      setPlateInput(data);
      performSearch(data);
    }
  };

  const handleAddVehicleWithPlate = () => {
    const plate = searchedPlate || plateInput.trim().toUpperCase();
    router.push({
      pathname: '/(manager)/vehicles/add',
      params: { plate }
    });
  };

  // --- Web Camera Management ---
  const startWebCamera = async () => {
    setCameraError(null);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        streamRef.current = stream;
        setCameraActive(true);
        // Delay attaching to ensure video element is rendered
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 100);
      } else {
        setCameraError('Webcam access is not supported by your browser.');
      }
    } catch (err: any) {
      console.warn('Camera permission or device error:', err);
      setCameraError(err.message || 'Could not access camera. Please check browser permissions.');
      setCameraActive(false);
    }
  };

  const stopWebCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: any) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (Platform.OS === 'web' && mode === 'camera') {
      startWebCamera();
    } else {
      stopWebCamera();
    }
    return () => {
      stopWebCamera();
    };
  }, [mode]);

  // Web Barcode / QR Detection loop if supported natively in browser
  useEffect(() => {
    let interval: any;
    if (Platform.OS === 'web' && mode === 'camera' && cameraActive && (window as any).BarcodeDetector) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a']
        });
        interval = setInterval(async () => {
          if (!videoRef.current || isProcessingOcr) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const code = barcodes[0].rawValue.trim();
              stopWebCamera();
              setMode('manual');
              setPlateInput(code);
              performSearch(code);
            }
          } catch {
            // Ignore frame-read errors during animation
          }
        }, 750);
      } catch (e) {
        console.log('BarcodeDetector not available:', e);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, cameraActive, isProcessingOcr]);

  // --- Dynamic Tesseract OCR Engine ---
  const loadTesseractScript = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Window not available'));
      if ((window as any).Tesseract) {
        return resolve((window as any).Tesseract);
      }
      const existing = document.getElementById('tesseract-cdn-script');
      if (existing) {
        existing.addEventListener('load', () => resolve((window as any).Tesseract));
        existing.addEventListener('error', () => reject(new Error('Failed to load OCR library')));
        return;
      }
      const script = document.createElement('script');
      script.id = 'tesseract-cdn-script';
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).Tesseract) {
          resolve((window as any).Tesseract);
        } else {
          reject(new Error('Tesseract library initialized without global object'));
        }
      };
      script.onerror = () => reject(new Error('Could not download OCR engine. Please check internet connection.'));
      document.head.appendChild(script);
    });
  };

  const processImageWithOcr = async (imageUri: string) => {
    setIsProcessingOcr(true);
    setScannedImagePreview(imageUri);
    setOcrStatusText('Loading OCR engine...');

    try {
      if (Platform.OS === 'web') {
        const Tesseract = await loadTesseractScript();
        setOcrStatusText('Analyzing image characters...');

        const result = await Tesseract.recognize(imageUri, 'eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setOcrStatusText(`Reading plate... ${Math.round((m.progress || 0) * 100)}%`);
            } else if (m.status === 'loading tesseract core') {
              setOcrStatusText('Loading OCR core engine...');
            }
          }
        });

        const rawText: string = (result?.data?.text as string) || '';
        console.log('License Plate OCR Raw Output:', rawText);

        const knownPlates = vehicles.map((v: any) => v.plate || v.license_plate).filter(Boolean);
        const extracted = extractLicensePlate(rawText, knownPlates);

        if (extracted) {
          setPlateInput(extracted);
          stopWebCamera();
          setMode('manual');
          performSearch(extracted);
        } else {
          const fallback = rawText.replace(/[^A-Z0-9- ]/gi, '').trim().split(/\s+/).filter((w: string) => w.length >= 3)[0] || '';
          if (fallback) {
            setPlateInput(fallback.toUpperCase());
            stopWebCamera();
            setMode('manual');
            performSearch(fallback.toUpperCase());
          } else {
            setOcrStatusText('No clear license plate found in image. Please try closer or enter manually.');
          }
        }
      } else {
        // Native fallback
        setOcrStatusText('Photo captured. Processing plate...');
      }
    } catch (err: any) {
      console.error('OCR Processing error:', err);
      setOcrStatusText('Could not scan plate. Please try another photo or enter manually.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // Capture frame from live webcam
  const handleCaptureFromWebcam = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      processImageWithOcr(dataUrl);
    } catch (err: any) {
      console.error('Webcam snapshot error:', err);
    }
  };

  // Upload Photo for OCR
  const handleTriggerPhotoUpload = () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      handleNativePickPhoto();
    }
  };

  const handleWebPhotoSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processImageWithOcr(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNativePickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        const asset = res.assets[0];
        const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        processImageWithOcr(dataUri);
      }
    } catch (e) {
      console.warn('Native photo picker error:', e);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleClose}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Vehicle Plate Lookup</Text>
          <Text style={styles.headerSubtitle}>Search, live-scan or upload fleet vehicle license plate</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Toggle Mode: Manual vs Camera */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity 
            style={[styles.segmentBtn, mode === 'manual' && styles.segmentBtnActive]} 
            onPress={() => setMode('manual')}
          >
            <Ionicons name="keypad-outline" size={18} color={mode === 'manual' ? '#043094' : '#6B7280'} />
            <Text style={[styles.segmentText, mode === 'manual' && styles.segmentTextActive]}>Enter Plate</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, mode === 'camera' && styles.segmentBtnActive]} 
            onPress={() => {
              if (Platform.OS !== 'web' && (!permission || !permission.granted)) {
                requestPermission();
              }
              setMode('camera');
            }}
          >
            <Ionicons name="camera-outline" size={18} color={mode === 'camera' ? '#043094' : '#6B7280'} />
            <Text style={[styles.segmentText, mode === 'camera' && styles.segmentTextActive]}>Scan Plate</Text>
          </TouchableOpacity>
        </View>

        {/* Camera Mode */}
        {mode === 'camera' ? (
          <View style={styles.cameraBox}>
            {Platform.OS === 'web' ? (
              <View style={styles.webCameraContainer}>
                {cameraActive ? (
                  <View style={styles.webVideoWrapper}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {/* Viewfinder Target Reticle */}
                    <View style={styles.cameraOverlay} pointerEvents="none">
                      <View style={styles.plateTargetBox}>
                        <View style={styles.plateTargetCornerTL} />
                        <View style={styles.plateTargetCornerTR} />
                        <View style={styles.plateTargetCornerBL} />
                        <View style={styles.plateTargetCornerBR} />
                        <Text style={styles.plateTargetHint}>ALIGN LICENSE PLATE HERE</Text>
                      </View>
                      <Text style={styles.cameraInstruction}>Position license plate or vehicle barcode in the frame</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.webCameraFallback}>
                    <Ionicons name="camera-outline" size={48} color="#94A3B8" />
                    <Text style={styles.webFallbackTitle}>Live Camera Scanner</Text>
                    <Text style={styles.webFallbackDesc}>
                      {cameraError || 'Activate your webcam to scan plates live, or upload a photo of the vehicle plate directly.'}
                    </Text>
                    <TouchableOpacity style={styles.startCamBtn} onPress={startWebCamera}>
                      <Ionicons name="videocam" size={18} color="#fff" />
                      <Text style={styles.startCamBtnText}>Start Live Camera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.nativeCameraContainer}>
                <CameraView
                  style={StyleSheet.absoluteFill as any}
                  facing="back"
                  onBarcodeScanned={handleBarCodeScanned}
                />
                <View style={styles.cameraOverlay}>
                  <View style={styles.plateTargetBox}>
                    <View style={styles.plateTargetCornerTL} />
                    <View style={styles.plateTargetCornerTR} />
                    <View style={styles.plateTargetCornerBL} />
                    <View style={styles.plateTargetCornerBR} />
                    <Text style={styles.plateTargetHint}>ALIGN LICENSE PLATE HERE</Text>
                  </View>
                  <Text style={styles.cameraInstruction}>Position license plate or vehicle barcode in the frame</Text>
                </View>
              </View>
            )}

            {/* OCR Live / Action Controls */}
            <View style={styles.scannerActionsCard}>
              <View style={styles.cameraControlsRow}>
                {Platform.OS === 'web' && cameraActive && (
                  <TouchableOpacity
                    style={[styles.captureBtn, isProcessingOcr && styles.btnDisabled]}
                    onPress={handleCaptureFromWebcam}
                    disabled={isProcessingOcr}
                  >
                    <Ionicons name="scan-circle" size={22} color="#fff" />
                    <Text style={styles.captureBtnText}>Capture & Read Plate (OCR)</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.uploadPhotoBtn, isProcessingOcr && styles.btnDisabled]}
                  onPress={handleTriggerPhotoUpload}
                  disabled={isProcessingOcr}
                >
                  <Ionicons name="image-outline" size={18} color="#043094" />
                  <Text style={styles.uploadPhotoBtnText}>Upload Plate Photo</Text>
                </TouchableOpacity>

                {Platform.OS === 'web' && cameraActive && (
                  <TouchableOpacity style={styles.stopCamBtn} onPress={stopWebCamera}>
                    <Ionicons name="videocam-off-outline" size={16} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Hidden file input for web photo upload */}
              {Platform.OS === 'web' && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleWebPhotoSelect}
                />
              )}

              {/* OCR Scanning Progress Box */}
              {isProcessingOcr && (
                <View style={styles.ocrLoadingCard}>
                  <ActivityIndicator size="small" color="#043094" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.ocrLoadingTitle}>Scanning Plate with OCR...</Text>
                    <Text style={styles.ocrLoadingSub}>{ocrStatusText || 'Analyzing image characters...'}</Text>
                  </View>
                  {scannedImagePreview && (
                    <Image source={{ uri: scannedImagePreview }} style={styles.ocrThumbPreview} />
                  )}
                </View>
              )}

              {!isProcessingOcr && ocrStatusText !== '' && (
                <View style={styles.ocrStatusBanner}>
                  <Ionicons name="information-circle-outline" size={16} color="#043094" />
                  <Text style={styles.ocrStatusBannerText}>{ocrStatusText}</Text>
                </View>
              )}

              {/* Quick sample plate chips */}
              {vehicles.length > 0 && (
                <View style={styles.samplePlatesContainer}>
                  <Text style={styles.samplePlatesLabel}>Quick select registered fleet plates:</Text>
                  <View style={styles.plateChips}>
                    {vehicles.slice(0, 4).map((v: any) => (
                      <TouchableOpacity 
                        key={v.id} 
                        style={styles.plateChip}
                        onPress={() => {
                          setPlateInput(v.plate || '');
                          stopWebCamera();
                          setMode('manual');
                          performSearch(v.plate || '');
                        }}
                      >
                        <Ionicons name="car-sport" size={14} color="#043094" />
                        <Text style={styles.plateChipText}>{v.plate || v.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* Manual Input Mode */
          <View style={styles.searchCard}>
            <Text style={styles.searchCardLabel}>License Plate Number</Text>
            
            {/* License Plate Graphic Input Box */}
            <View style={styles.plateInputContainer}>
              <View style={styles.plateBadgeSide}>
                <Ionicons name="car-outline" size={18} color="#fff" />
                <Text style={styles.plateBadgeText}>FLEET</Text>
              </View>
              <TextInput
                style={styles.plateTextInput}
                placeholder="e.g. GR-293-24"
                placeholderTextColor="#9CA3AF"
                value={plateInput}
                onChangeText={(val) => setPlateInput(val.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleManualSearch}
              />
              {plateInput.length > 0 && (
                <TouchableOpacity onPress={() => setPlateInput('')} style={styles.clearInputBtn}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.searchButton, (!plateInput.trim() || isSearching) && styles.searchButtonDisabled]}
              onPress={handleManualSearch}
              disabled={!plateInput.trim() || isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#fff" />
                  <Text style={styles.searchButtonText}>Search Vehicle</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Quick Suggestions from Fleet */}
            {searchStatus === 'idle' && vehicles.length > 0 && (
              <View style={styles.suggestionsBox}>
                <Text style={styles.suggestionsTitle}>Registered Fleet Plates:</Text>
                <View style={styles.plateChips}>
                  {vehicles.slice(0, 6).map((v: any) => (
                    <TouchableOpacity
                      key={v.id}
                      style={styles.plateChip}
                      onPress={() => {
                        setPlateInput(v.plate || '');
                        performSearch(v.plate || '');
                      }}
                    >
                      <Ionicons name="pricetag-outline" size={13} color="#043094" />
                      <Text style={styles.plateChipText}>{v.plate || v.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Results Section */}
        {searchStatus === 'found' && foundVehicle && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.statusSuccessBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.statusSuccessText}>Vehicle Found</Text>
              </View>
              <TouchableOpacity onPress={handleResetSearch}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.vehicleDetailsRow}>
              <Image 
                source={{ uri: foundVehicle.image || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=150&h=150' }} 
                style={styles.vehicleImage} 
              />
              <View style={styles.vehicleMeta}>
                <Text style={styles.vehicleName}>{foundVehicle.name || 'Unnamed Vehicle'}</Text>
                <Text style={styles.vehicleSub}>
                  {[foundVehicle.year, foundVehicle.make, foundVehicle.model].filter(Boolean).join(' ') || 'Fleet Asset'}
                </Text>
                
                {/* Embossed License Plate Tag */}
                <View style={styles.embossedPlateTag}>
                  <Text style={styles.embossedPlateText}>{foundVehicle.plate || 'NO PLATE'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Assigned Driver</Text>
                <View style={styles.infoValueRow}>
                  <Ionicons name="person-circle-outline" size={16} color="#4B5563" />
                  <Text style={styles.infoValue}>{foundVehicle.assignedTo || 'Unassigned'}</Text>
                </View>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.badge, { 
                  backgroundColor: foundVehicle.status === 'Active' ? '#ECFDF5' : 
                                  foundVehicle.status === 'In Shop' ? '#FEF3C7' : '#FEE2E2' 
                }]}>
                  <Text style={[styles.badgeText, { 
                    color: foundVehicle.status === 'Active' ? '#059669' : 
                          foundVehicle.status === 'In Shop' ? '#D97706' : '#DC2626' 
                  }]}>
                    {foundVehicle.status || 'Active'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Current Meter</Text>
                <Text style={styles.infoValue}>{foundVehicle.meter ? `${foundVehicle.meter} mi` : '0 mi'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Vehicle Group</Text>
                <Text style={styles.infoValue}>{foundVehicle.group || 'General'}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.detailsBtn} 
                onPress={() => router.push(`/(manager)/vehicles/${foundVehicle.id}` as any)}
              >
                <Text style={styles.detailsBtnText}>View Full Details</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetSearch}>
                <Text style={styles.resetBtnText}>Search Another</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Not Found State */}
        {searchStatus === 'not_found' && (
          <View style={styles.notFoundCard}>
            <View style={styles.notFoundIconCircle}>
              <Ionicons name="search-outline" size={36} color="#DC2626" />
            </View>
            <Text style={styles.notFoundTitle}>Vehicle Does Not Exist</Text>
            <Text style={styles.notFoundDesc}>
              No vehicle in your fleet was found matching license plate{' '}
              <Text style={{ fontWeight: '700', color: '#111827' }}>"{searchedPlate}"</Text>.
            </Text>

            <View style={styles.notFoundActions}>
              <TouchableOpacity 
                style={styles.createVehicleBtn} 
                onPress={handleAddVehicleWithPlate}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createVehicleBtnText}>Create Vehicle with Plate</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tryAgainBtn} 
                onPress={handleResetSearch}
              >
                <Text style={styles.tryAgainBtnText}>Try Another Plate</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
    alignItems: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    width: '100%',
    maxWidth: 520,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#043094',
    fontWeight: '700',
  },

  // Search Card
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  plateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 16,
  },
  plateBadgeSide: {
    backgroundColor: '#043094',
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  plateTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  clearInputBtn: {
    padding: 10,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#043094',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Suggestions
  suggestionsBox: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  plateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  plateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  plateChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#043094',
    letterSpacing: 0.5,
  },

  // Camera Box
  cameraBox: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  webCameraFallback: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFallbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  webFallbackDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  samplePlatesContainer: {
    marginTop: 24,
    width: '100%',
  },
  samplePlatesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  nativeCameraContainer: {
    height: 340,
    position: 'relative',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateTargetBox: {
    width: 280,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  plateTargetCornerTL: { position: 'absolute', top: -3, left: -3, width: 16, height: 16, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#fff' },
  plateTargetCornerTR: { position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#fff' },
  plateTargetCornerBL: { position: 'absolute', bottom: -3, left: -3, width: 16, height: 16, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#fff' },
  plateTargetCornerBR: { position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#fff' },
  plateTargetHint: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  cameraInstruction: { color: '#E2E8F0', fontSize: 13, marginTop: 20 },

  // Result Card (Found)
  resultCard: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusSuccessText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
  },
  vehicleDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  vehicleImage: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  vehicleMeta: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  vehicleSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  embossedPlateTag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  embossedPlateText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  infoCol: {
    width: '46%',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#043094',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  detailsBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  resetBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },

  // Not Found Card
  notFoundCard: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  notFoundIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  notFoundDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  notFoundActions: {
    width: '100%',
    gap: 10,
  },
  createVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#043094',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    width: '100%',
  },
  createVehicleBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  tryAgainBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    width: '100%',
  },
  tryAgainBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },

  // Webcam & OCR Scanning Styles
  webCameraContainer: {
    width: '100%',
    minHeight: 260,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webVideoWrapper: {
    width: '100%',
    height: 320,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  startCamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#043094',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    marginTop: 16,
  },
  startCamBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  scannerActionsCard: {
    padding: 16,
    backgroundColor: '#fff',
  },
  cameraControlsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  captureBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#043094',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  captureBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  uploadPhotoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  uploadPhotoBtnText: {
    color: '#043094',
    fontWeight: '700',
    fontSize: 13,
  },
  stopCamBtn: {
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  ocrLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  ocrLoadingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  ocrLoadingSub: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  ocrThumbPreview: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ocrStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ocrStatusBannerText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
});
