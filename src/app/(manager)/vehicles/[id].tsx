import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions, TextInput, Modal, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import ResponsiveBarChart from '../../../components/ResponsiveBarChart';
import ResponsiveStackedBarChart from '../../../components/ResponsiveStackedBarChart';
import { useVehicles } from '../../../context/VehicleContext';

const TABS = ['Overview', 'Specs', 'Financial', 'Warranties', 'Tire Management', 'Tire Activity', 'Telematics', 'Sensor Data Snapshots', 'Service History'];

const costData = [
  { stacks: [{value: 4100, color: '#06b6d4'}, {value: 500, color: '#eab308'}, {value: 100, color: '#a855f7'}], label: 'Jun' },
  { stacks: [{value: 3800, color: '#06b6d4'}, {value: 200, color: '#eab308'}, {value: 0, color: '#a855f7'}], label: 'Jul' },
  { stacks: [{value: 5200, color: '#06b6d4'}, {value: 1200, color: '#eab308'}, {value: 50, color: '#a855f7'}], label: 'Aug' },
  { stacks: [{value: 4000, color: '#06b6d4'}, {value: 0, color: '#eab308'}, {value: 0, color: '#a855f7'}], label: 'Sep' },
  { stacks: [{value: 4800, color: '#06b6d4'}, {value: 800, color: '#eab308'}, {value: 200, color: '#a855f7'}], label: 'Oct' },
  { stacks: [{value: 3500, color: '#06b6d4'}, {value: 150, color: '#eab308'}, {value: 0, color: '#a855f7'}], label: 'Nov' },
  { stacks: [{value: 4200, color: '#06b6d4'}, {value: 600, color: '#eab308'}, {value: 100, color: '#a855f7'}], label: 'Dec' },
  { stacks: [{value: 3900, color: '#06b6d4'}, {value: 0, color: '#eab308'}, {value: 0, color: '#a855f7'}], label: 'Jan' },
  { stacks: [{value: 4500, color: '#06b6d4'}, {value: 900, color: '#eab308'}, {value: 150, color: '#a855f7'}], label: 'Feb' },
  { stacks: [{value: 4100, color: '#06b6d4'}, {value: 200, color: '#eab308'}, {value: 0, color: '#a855f7'}], label: 'Mar' },
  { stacks: [{value: 4032, color: '#06b6d4'}, {value: 164, color: '#eab308'}, {value: 0, color: '#a855f7'}], label: 'Apr' },
  { stacks: [{value: 2800, color: '#06b6d4'}, {value: 100, color: '#eab308'}, {value: 50, color: '#a855f7'}], label: 'May' },
];

const utilData = [
  {value: 120, label: 'Jun'}, {value: 150, label: 'Jul'}, {value: 180, label: 'Aug'}, {value: 100, label: 'Sep'},
  {value: 220, label: 'Oct'}, {value: 130, label: 'Nov'}, {value: 170, label: 'Dec'}, {value: 160, label: 'Jan'},
  {value: 210, label: 'Feb'}, {value: 140, label: 'Mar'}, {value: 190, label: 'Apr'}, {value: 80, label: 'May'}
];

export default function VehicleDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('Overview');
  const [documents, setDocuments] = useState([
    { id: '1', name: 'Freightliner_Powertrain.pdf', size: '2.4 MB', date: 'Oct 12, 2018' }
  ]);

  const handleUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.canceled) return;
      
      const newDocs = result.assets.map(asset => ({
        id: Math.random().toString(),
        name: asset.name,
        size: asset.size ? (asset.size / (1024 * 1024)).toFixed(1) + ' MB' : 'Unknown',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }));
      setDocuments([...documents, ...newDocs]);
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };
  
  const isLarge = width >= 1024;
  const isMedium = width >= 768;
  const hasSidebar = width >= 768;
  const mainWidth = hasSidebar ? width - 280 : width;
  const rightColWidth = isLarge ? mainWidth * 0.55 : '100%';
  const chartWidth = isLarge ? (mainWidth * 0.55) - 80 : mainWidth - 80;
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    barPercentage: 0.6,
    propsForLabels: { fontSize: 10 },
  };

  const { vehicles, updateVehicleImage, updateVehicleData } = useVehicles();
  const currentVehicle = vehicles.find((v: any) => v.id === id) || vehicles[0];

  const [isEditing, setIsEditing] = useState(false);
  const [vehicleImage, setVehicleImage] = useState(currentVehicle.image || 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=200&h=200');
  
  const [labels, setLabels] = useState(['Heavy Duty', 'Leased']);
  const [labelsModalVisible, setLabelsModalVisible] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  
  const [personalizeVisible, setPersonalizeVisible] = useState(false);
  const [dashboardPrefs, setDashboardPrefs] = useState({
    'Cost per Mile': true,
    'Utilization': true,
    'Recent Activity': true,
    'Documents': true
  });

  const togglePref = (key: keyof typeof dashboardPrefs) => {
    setDashboardPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);

  const handleTakePhoto = async () => {
    setImagePickerModalVisible(false);
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        if (Platform.OS === 'web') {
          window.alert("You've refused to allow this app to access your camera!");
        } else {
          Alert.alert("Permission Denied", "You've refused to allow this app to access your camera!");
        }
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setVehicleImage(result.assets[0].uri);
        updateVehicleImage(currentVehicle.id, result.assets[0].uri);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleChooseFromLibrary = async () => {
    setImagePickerModalVisible(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setVehicleImage(result.assets[0].uri);
        updateVehicleImage(currentVehicle.id, result.assets[0].uri);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handlePickImage = () => {
    setImagePickerModalVisible(true);
  };

  const handleAddLabel = () => {
    if (newLabel.trim()) {
      setLabels([...labels, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const removeLabel = (indexToRemove: number) => {
    setLabels(labels.filter((_, index) => index !== indexToRemove));
  };

  const [vehicleData, setVehicleData] = useState({
    id: currentVehicle.id,
    name: currentVehicle.name,
    meter: currentVehicle.meter?.replace(' hr', '').replace(' mi', '') || '0',
    status: currentVehicle.status,
    autoIntegrate: 'Enabled - Pending',
    group: currentVehicle.group,
    operator: currentVehicle.assignedTo || 'Unassigned',
    type: currentVehicle.type,
    fuelType: '--',
    vin: currentVehicle.vin,
    plate: currentVehicle.plate || '--',
    year: currentVehicle.year,
    make: currentVehicle.make,
    engine: '12.8L',
    transmission: '10-Speed Automatic',
    drive: '6x4',
    gvwr: '52,000 lbs',
    wheelbase: '230 in',
    purchasePrice: 'GH₵145,000.00',
    purchaseDate: 'Oct 12, 2018',
    currentValue: 'GH₵82,500.00',
    loan: 'Paid Off',
    powertrainWarranty: '5 Years / 500,000 Miles',
    powertrainExpires: 'Oct 12, 2023',
    bumperToBumper: '3 Years / 300,000 Miles',
    bumperExpires: 'Oct 12, 2021',
  });

  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(manager)/vehicles');
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#4B5563" />
          <Text style={styles.backText}>Vehicles</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handlePickImage} style={{ position: 'relative' }}>
              <Image source={{uri: vehicleImage}} style={styles.vehicleImg} />
              <View style={{ position: 'absolute', bottom: 5, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>{vehicleData.name}</Text>
              <Text style={styles.subtitle}>{vehicleData.type} • {vehicleData.year} {vehicleData.make} • {vehicleData.vin}</Text>
              <View style={styles.badgesRow}>
                <Text style={styles.metaText}>{vehicleData.meter} mi</Text>
                <View style={styles.dot} />
                <View style={styles.statusBadge}><View style={styles.statusDot}/><Text style={styles.statusText}>{vehicleData.status}</Text></View>
                <Text style={styles.metaText}>{vehicleData.group}</Text>
                <Text style={styles.metaText}>{vehicleData.operator}</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                {labels.map((lbl, idx) => (
                  <View key={idx} style={{ backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginBottom: 5 }}>
                    <Text style={{ color: '#3730A3', fontSize: 12, fontWeight: '500' }}>{lbl}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.editLabelsBtn} onPress={() => setLabelsModalVisible(true)}>
                  <Ionicons name="pricetag-outline" size={14} color="#6B7280" style={{marginRight: 4}} />
                  <Text style={styles.editLabelsText}>Edit Labels</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {!isMedium ? null : (
            <View style={styles.headerRight}>
              <View style={styles.avatarCircle}><Text style={styles.avatarText}>SC</Text></View>
              <TouchableOpacity style={styles.iconBtn}><Ionicons name="person-add-outline" size={18} color="#6B7280" /></TouchableOpacity>
              <TouchableOpacity style={styles.watchBtn}><Ionicons name="eye-off-outline" size={18} color="#6B7280" style={{marginRight: 4}}/><Text style={styles.watchText}>Unwatch</Text></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}><Ionicons name="ellipsis-horizontal" size={18} color="#6B7280" /></TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(!isEditing)}>
                <Ionicons name="pencil-outline" size={16} color="#374151" style={{marginRight: 6}}/>
                <Text style={styles.editText}>{isEditing ? 'Save' : 'Edit'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn}><Ionicons name="add" size={18} color="#fff" style={{marginRight: 4}}/><Text style={styles.addBtnText}>Add</Text><Ionicons name="chevron-down" size={16} color="#fff" style={{marginLeft: 4}}/></TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.tab}><Text style={styles.tabText}>More <Ionicons name="chevron-down" size={12} /></Text></TouchableOpacity>
        </ScrollView>
        <TouchableOpacity style={styles.personalizeBtn} onPress={() => setPersonalizeVisible(true)}>
          <Ionicons name="options-outline" size={16} color="#4B5563" style={{marginRight: 6}} />
          <Text style={styles.personalizeText}>Personalize</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content}>
        <View style={[styles.grid, !isMedium && { flexDirection: 'column' }]}>
          
          {activeTab === 'Overview' && (
            <>
              {/* Left Col - Details */}
              <View style={[styles.detailsCol, isMedium && { flex: 1, marginRight: 20 }]}>
                <View style={styles.card}>
                  <View style={[styles.cardHeaderRow, { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 10 }]}>
                    <View>
                      <Text style={styles.cardTitle}>Details</Text>
                      <Text style={[styles.sectionHeader, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>All Fields</Text>
                    </View>
                    {!isMedium && (
                      <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: 12 }]} onPress={() => setIsEditing(!isEditing)}>
                        <Text style={styles.addBtnText}>{isEditing ? 'Save Details' : 'Edit Details'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={vehicleData.name} onChangeText={t => setVehicleData({...vehicleData, name: t})} /> : <Text style={styles.fieldValue}>{vehicleData.name}</Text>}
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Meter</Text>
                    <View style={styles.fieldValueRow}>
                      {isEditing ? <TextInput style={styles.editInput} value={vehicleData.meter} onChangeText={t => setVehicleData({...vehicleData, meter: t})} /> : <Text style={styles.fieldValue}>{vehicleData.meter} mi</Text>}
                      {!isEditing && (
                        <TouchableOpacity onPress={() => router.push(`/(manager)/vehicles/meter-sync?id=${vehicleData.id}` as any)}>
                          <Ionicons name="refresh" size={16} color="#0EA5E9" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Status</Text>
                    <View style={styles.fieldValueRow}>
                      {isEditing ? <TextInput style={styles.editInput} value={vehicleData.status} onChangeText={t => setVehicleData({...vehicleData, status: t})} /> : <View style={styles.statusBadge}><View style={styles.statusDot}/><Text style={styles.statusText}>{vehicleData.status}</Text></View>}
                      {!isEditing && (
                        <TouchableOpacity onPress={() => router.push(`/(manager)/vehicles/history?id=${vehicleData.id}&type=status` as any)}>
                          <Text style={styles.linkText}>History</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Group</Text>
                    <View style={styles.fieldValueRow}>
                      <View>
                        {isEditing ? <TextInput style={styles.editInput} value={vehicleData.group} onChangeText={t => setVehicleData({...vehicleData, group: t})} /> : <Text style={styles.fieldValue}>{vehicleData.group}</Text>}
                        {!isEditing && <Text style={styles.fieldSubValue}>Alabama /</Text>}
                      </View>
                      {!isEditing && (
                        <TouchableOpacity onPress={() => router.push(`/(manager)/vehicles/history?id=${vehicleData.id}&type=group` as any)}>
                          <Text style={styles.linkText}>History</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Operator</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={vehicleData.operator} onChangeText={t => setVehicleData({...vehicleData, operator: t})} /> : <Text style={styles.fieldValue}>{vehicleData.operator}</Text>}
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Type</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={vehicleData.type} onChangeText={t => setVehicleData({...vehicleData, type: t})} /> : <Text style={[styles.fieldValue, {color: '#0EA5E9'}]}>{vehicleData.type}</Text>}
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>VIN/SN</Text>
                    <View style={styles.fieldValueRow}>
                      {isEditing ? <TextInput style={styles.editInput} value={vehicleData.vin} onChangeText={t => setVehicleData({...vehicleData, vin: t})} /> : <Text style={styles.fieldValue}>{vehicleData.vin}</Text>}
                      {!isEditing && <Text style={styles.linkText}>Decode VIN</Text>}
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Year</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={vehicleData.year} onChangeText={t => setVehicleData({...vehicleData, year: t})} /> : <Text style={styles.fieldValue}>{vehicleData.year}</Text>}
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Make</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={vehicleData.make} onChangeText={t => setVehicleData({...vehicleData, make: t})} /> : <Text style={styles.fieldValue}>{vehicleData.make}</Text>}
                  </View>
                </View>
              </View>

              {/* Right Col - Charts */}
              <View style={[styles.chartsCol, isLarge && { width: rightColWidth }]}>
                {/* Cost of Ownership */}
                {dashboardPrefs['Cost per Mile'] && (
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>Cost of Ownership</Text>
                      <TouchableOpacity style={styles.filterChip}><Ionicons name="calendar-outline" size={14} color="#0EA5E9" style={{marginRight: 6}} /><Text style={[styles.filterChipText, {color: '#0EA5E9'}]}>Last 12 Months</Text><Ionicons name="chevron-down" size={14} color="#0EA5E9" style={{marginLeft: 4}} /></TouchableOpacity>
                    </View>
                    
                    <View style={styles.costMetricsRow}>
                      <View style={styles.costMetric}>
                        <Text style={styles.costLabel}>Total Costs</Text>
                        <Text style={styles.costValue}>GH₵52,682.31</Text>
                      </View>
                      <View style={styles.costMetric}>
                        <Text style={styles.costLabel}>Cost Per Meter</Text>
                        <Text style={styles.costValue}>GH₵182.92 <Text style={{fontSize: 14, color: '#6B7280'}}>/ mi</Text></Text>
                      </View>
                    </View>

                    <ResponsiveStackedBarChart
                      stackData={costData}
                      width={chartWidth}
                      height={200}
                    />
                    
                    <View style={styles.legendRow}>
                      <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#06b6d4'}]} /><View><Text style={styles.legendLabel}>Fuel Costs</Text><Text style={styles.legendValue}>GH₵51,877.27</Text></View></View>
                      <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#eab308'}]} /><View><Text style={styles.legendLabel}>Service Costs</Text><Text style={styles.legendValue}>GH₵590.53</Text></View></View>
                      <View style={styles.legendItem}><View style={[styles.legendDot, {backgroundColor: '#a855f7'}]} /><View><Text style={styles.legendLabel}>Other Costs</Text><Text style={styles.legendValue}>GH₵214.51</Text></View></View>
                    </View>
                  </View>
                )}

                {/* Utilization */}
                {dashboardPrefs['Utilization'] && (
                  <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>Utilization</Text>
                      <TouchableOpacity style={styles.filterChip}><Ionicons name="calendar-outline" size={14} color="#6B7280" style={{marginRight: 6}} /><Text style={styles.filterChipText}>All Time</Text><Ionicons name="chevron-down" size={14} color="#6B7280" style={{marginLeft: 4}} /></TouchableOpacity>
                    </View>
                    <ResponsiveBarChart
                      data={utilData}
                      width={chartWidth}
                      height={200}
                      color="#0ea5e9"
                    />
                  </View>
                )}
              </View>
            </>
          )}

          {activeTab === 'Specs' && (
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }}>
              <View style={[styles.cardHeaderRow, { marginBottom: 15 }]}>
                <Text style={styles.cardTitle}>Vehicle Specifications</Text>
                {!isMedium && (
                  <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: 12 }]} onPress={() => setIsEditing(!isEditing)}>
                    <Text style={styles.addBtnText}>{isEditing ? 'Save Specs' : 'Edit Specs'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Engine Size</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.engine} onChangeText={t => setVehicleData({...vehicleData, engine: t})} /> : <Text style={styles.fieldValue}>{vehicleData.engine}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Transmission</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.transmission} onChangeText={t => setVehicleData({...vehicleData, transmission: t})} /> : <Text style={styles.fieldValue}>{vehicleData.transmission}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Drive Type</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.drive} onChangeText={t => setVehicleData({...vehicleData, drive: t})} /> : <Text style={styles.fieldValue}>{vehicleData.drive}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>GVWR</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.gvwr} onChangeText={t => setVehicleData({...vehicleData, gvwr: t})} /> : <Text style={styles.fieldValue}>{vehicleData.gvwr}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Wheelbase</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.wheelbase} onChangeText={t => setVehicleData({...vehicleData, wheelbase: t})} /> : <Text style={styles.fieldValue}>{vehicleData.wheelbase}</Text>}
              </View>
            </View>
          )}

          {activeTab === 'Financial' && (
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }}>
              <View style={[styles.cardHeaderRow, { marginBottom: 15 }]}>
                <Text style={styles.cardTitle}>Financial Data</Text>
                {!isMedium && (
                  <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: 12 }]} onPress={() => setIsEditing(!isEditing)}>
                    <Text style={styles.addBtnText}>{isEditing ? 'Save Data' : 'Edit Data'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Purchase Price</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.purchasePrice} onChangeText={t => setVehicleData({...vehicleData, purchasePrice: t})} /> : <Text style={styles.fieldValue}>{vehicleData.purchasePrice}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Purchase Date</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.purchaseDate} onChangeText={t => setVehicleData({...vehicleData, purchaseDate: t})} /> : <Text style={styles.fieldValue}>{vehicleData.purchaseDate}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Current Value</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.currentValue} onChangeText={t => setVehicleData({...vehicleData, currentValue: t})} /> : <Text style={styles.fieldValue}>{vehicleData.currentValue}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Loan/Lease</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.loan} onChangeText={t => setVehicleData({...vehicleData, loan: t})} /> : <Text style={styles.fieldValue}>{vehicleData.loan}</Text>}
              </View>
            </View>
          )}

          {activeTab === 'Warranties' && (
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }}>
              <View style={[styles.cardHeaderRow, { marginBottom: 15 }]}>
                <Text style={styles.cardTitle}>Warranties</Text>
                {!isMedium && (
                  <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: 12 }]} onPress={() => setIsEditing(!isEditing)}>
                    <Text style={styles.addBtnText}>{isEditing ? 'Save Warranties' : 'Edit Warranties'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Powertrain Warranty</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.powertrainWarranty} onChangeText={t => setVehicleData({...vehicleData, powertrainWarranty: t})} /> : <Text style={styles.fieldValue}>{vehicleData.powertrainWarranty}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Powertrain Expires</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.powertrainExpires} onChangeText={t => setVehicleData({...vehicleData, powertrainExpires: t})} /> : <Text style={styles.fieldValue}>{vehicleData.powertrainExpires}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Bumper to Bumper</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.bumperToBumper} onChangeText={t => setVehicleData({...vehicleData, bumperToBumper: t})} /> : <Text style={styles.fieldValue}>{vehicleData.bumperToBumper}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Bumper Expires</Text>
                {isEditing ? <TextInput style={styles.editInput} value={vehicleData.bumperExpires} onChangeText={t => setVehicleData({...vehicleData, bumperExpires: t})} /> : <Text style={styles.fieldValue}>{vehicleData.bumperExpires}</Text>}
              </View>

              {dashboardPrefs['Documents'] && (
                <View style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                  <Text style={[styles.cardTitle, { fontSize: 16, marginBottom: 12 }]}>Attached Documents</Text>
                  
                  {documents.map((doc) => (
                    <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name="document-text" size={24} color="#0EA5E9" style={{ marginRight: 12 }} />
                        <View>
                          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>{doc.name}</Text>
                          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{doc.size} • {doc.date}</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={{ padding: 6, backgroundColor: isEditing ? '#FEE2E2' : 'transparent', borderRadius: 6 }}
                        onPress={() => {
                          if (isEditing) {
                            setDocuments(documents.filter(d => d.id !== doc.id));
                          } else {
                            alert('Downloading document...');
                          }
                        }}
                      >
                        <Ionicons name={isEditing ? "trash-outline" : "download-outline"} size={20} color={isEditing ? "#EF4444" : "#6B7280"} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {isEditing && (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed' }} 
                      onPress={handleUploadDocument}
                    >
                      <Ionicons name="cloud-upload-outline" size={20} color="#4B5563" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 14, color: '#4B5563', fontWeight: '600' }}>Upload Document</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {activeTab !== 'Overview' && activeTab !== 'Specs' && activeTab !== 'Financial' && activeTab !== 'Warranties' && (
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', height: 400 }}>
              <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" style={{marginBottom: 10}} />
              <Text style={{fontSize: 16, color: '#6B7280', fontWeight: '500'}}>No {activeTab} data available yet.</Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Edit Labels Modal */}
      <Modal visible={labelsModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={styles.modalTitle}>Edit Vehicle Labels</Text>
              <TouchableOpacity onPress={() => setLabelsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
              {labels.map((lbl, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 }}>
                  <Text style={{ color: '#3730A3', fontSize: 13, fontWeight: '500', marginRight: 5 }}>{lbl}</Text>
                  <TouchableOpacity onPress={() => removeLabel(idx)}>
                    <Ionicons name="close-circle" size={16} color="#3730A3" />
                  </TouchableOpacity>
                </View>
              ))}
              {labels.length === 0 && <Text style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No labels added.</Text>}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, marginRight: 10 }}
                placeholder="Add a new label..."
                value={newLabel}
                onChangeText={setNewLabel}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddLabel}>
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Personalize Modal */}
      <Modal visible={personalizeVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 320 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={styles.modalTitle}>Personalize Dashboard</Text>
              <TouchableOpacity onPress={() => setPersonalizeVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={{ color: '#4B5563', marginBottom: 20 }}>Toggle the sections you want to see on this dashboard:</Text>
            
            <View style={{ marginBottom: 15 }}>
              {(Object.keys(dashboardPrefs) as (keyof typeof dashboardPrefs)[]).map((section, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <Text style={{ fontSize: 16, color: '#111827' }}>{section}</Text>
                  <TouchableOpacity onPress={() => togglePref(section)}>
                    <Ionicons 
                      name={dashboardPrefs[section] ? "toggle" : "toggle-outline"} 
                      size={32} 
                      color={dashboardPrefs[section] ? "#10B981" : "#9CA3AF"} 
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
            <TouchableOpacity style={[styles.addBtn, { justifyContent: 'center', paddingVertical: 12 }]} onPress={() => setPersonalizeVisible(false)}>
              <Text style={styles.addBtnText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal visible={imagePickerModalVisible} transparent={true} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setImagePickerModalVisible(false)}>
          <View style={[styles.modalContent, { width: 300 }]}>
            <Text style={styles.modalTitle}>Update Vehicle Photo</Text>
            
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={24} color="#0EA5E9" />
              <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15 }} onPress={handleChooseFromLibrary}>
              <Ionicons name="image-outline" size={24} color="#10B981" />
              <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backText: { fontSize: 14, color: '#4B5563', marginLeft: 4, fontWeight: '500' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row' },
  vehicleImg: { width: 80, height: 80, borderRadius: 8, marginRight: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metaText: { fontSize: 13, color: '#4B5563', marginRight: 8 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  editLabelsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  editLabelsText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  iconBtn: { padding: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, marginRight: 10 },
  watchBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, marginRight: 10 },
  watchText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, marginRight: 10 },
  editText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#10B981', borderRadius: 6 },
  addBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingHorizontal: 20 },
  tabsScroll: { flexDirection: 'row' },
  tab: { paddingVertical: 14, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#0EA5E9' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  activeTabText: { color: '#0EA5E9' },
  personalizeBtn: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  personalizeText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  contentScroll: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 20 },
  grid: { flexDirection: 'row' },
  detailsCol: {},
  chartsCol: {},
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 15 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#111827', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 10 },
  fieldRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  fieldLabel: { width: '40%', fontSize: 14, color: '#6B7280' },
  fieldValue: { fontSize: 14, color: '#111827' },
  fieldSubValue: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  fieldValueRow: { flexDirection: 'row', justifyContent: 'space-between', flex: 1, alignItems: 'center' },
  linkText: { fontSize: 13, color: '#0EA5E9', fontWeight: '500' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6 },
  filterChipText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  costMetricsRow: { flexDirection: 'row', marginBottom: 20 },
  costMetric: { flex: 1, borderRightWidth: 1, borderRightColor: '#F3F4F6', paddingRight: 20 },
  costLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  costValue: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  chart: { marginTop: 10, marginLeft: -10 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  legendItem: { flexDirection: 'row' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginRight: 8 },
  legendLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  legendValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  editInput: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827', outlineStyle: 'none' as any },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: '90%', maxWidth: 400, padding: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' }
});

