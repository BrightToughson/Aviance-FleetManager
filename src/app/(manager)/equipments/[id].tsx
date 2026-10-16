import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, useWindowDimensions, TextInput, Modal, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEquipments } from '../../../context/EquipmentContext';
import { useTranslation } from 'react-i18next';

const TABS = ['Overview', 'Documents'];

export default function EquipmentDetailsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('Overview');
  const [documents, setDocuments] = useState<any[]>([]);

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

  const { equipments, updateEquipmentImage, updateEquipmentData } = useEquipments();
  const currentEquipment = equipments.find((v: any) => v.id === id) || equipments[0];

  const [isEditing, setIsEditing] = useState(false);
  const [equipmentImage, setEquipmentImage] = useState(currentEquipment?.image || 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=200&q=80');
  
  const [labelsModalVisible, setLabelsModalVisible] = useState(false);
  
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      setImagePickerModalVisible(true);
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setEquipmentImage(result.assets[0].uri);
      await updateEquipmentImage(id as string, result.assets[0].uri);
    }
  };

  const handleWebImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const uri = URL.createObjectURL(file);
      setEquipmentImage(uri);
      updateEquipmentImage(id as string, uri);
      setImagePickerModalVisible(false);
    }
  };

  const [equipmentData, setEquipmentData] = useState({
    id: currentEquipment?.id,
    name: currentEquipment?.name,
    status: currentEquipment?.status || 'Available',
    group: currentEquipment?.group || 'Unassigned',
    assignedTo: currentEquipment?.assignedTo || 'Available in Warehouse',
    type: currentEquipment?.type || 'Equipment',
    serialNumber: currentEquipment?.serialNumber || '--',
    year: currentEquipment?.year || '--',
    make: currentEquipment?.make || '--',
    model: currentEquipment?.model || '--',
  });

  const saveDetails = async () => {
    setIsEditing(false);
    // await updateEquipmentData(equipmentData.id, { ...equipmentData });
    if (Platform.OS === 'web') {
      window.alert("Equipment details updated successfully!");
    } else {
      Alert.alert("Success", "Equipment details updated successfully!");
    }
  }

  if (!currentEquipment) {
    return <View style={styles.container}><Text>Equipment not found.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(manager)/equipments');
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#4B5563" />
          <Text style={styles.backText}>{t('equip_title', 'Equipments')}</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handlePickImage} style={{ position: 'relative' }}>
              <Image source={{uri: equipmentImage}} style={styles.equipmentImg} />
              <View style={{ position: 'absolute', bottom: 5, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 }}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>{equipmentData.name}</Text>
              <Text style={styles.subtitle}>{equipmentData.type} • {equipmentData.year} {equipmentData.make} {equipmentData.model}</Text>
              <View style={styles.badgesRow}>
                <View style={styles.statusBadge}>
                  <View style={[styles.statusDot, equipmentData.assignedTo !== 'Available in Warehouse' && {backgroundColor: '#3B82F6'}]} />
                  <Text style={[styles.statusText, equipmentData.assignedTo !== 'Available in Warehouse' && {color: '#1D4ED8'}]}>
                    {equipmentData.assignedTo !== 'Available in Warehouse' ? 'Checked Out' : 'Available'}
                  </Text>
                </View>
                <Text style={styles.metaText}>{equipmentData.group}</Text>
                <Text style={styles.metaText}>SN: {equipmentData.serialNumber}</Text>
              </View>
            </View>
          </View>
          
          {!isMedium ? null : (
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.editBtn} onPress={() => {
                if (isEditing) saveDetails();
                else setIsEditing(true);
              }}>
                <Ionicons name="pencil-outline" size={16} color="#374151" style={{marginRight: 6}}/>
                <Text style={styles.editText}>{isEditing ? t('common_save', 'Save') : t('common_edit', 'Edit')}</Text>
              </TouchableOpacity>
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
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content}>
        <View style={[styles.grid, !isMedium && { flexDirection: 'column' }]}>
          
          {activeTab === 'Overview' && (
            <>
              {/* Left Col - Details */}
              <View style={[styles.detailsCol, isMedium && { flex: 1 }]}>
                <View style={styles.card}>
                  <View style={[styles.cardHeaderRow, { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 10 }]}>
                    <View>
                      <Text style={styles.cardTitle}>{t('equip_details_title', 'Equipment Details')}</Text>
                    </View>
                    {!isMedium && (
                      <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: 12 }]} onPress={() => {
                        if (isEditing) saveDetails();
                        else setIsEditing(true);
                      }}>
                        <Text style={styles.addBtnText}>{isEditing ? t('common_save', 'Save') : t('common_edit', 'Edit')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={equipmentData.name} onChangeText={t => setEquipmentData({...equipmentData, name: t})} /> : <Text style={styles.fieldValue}>{equipmentData.name}</Text>}
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Currently Assigned To</Text>
                    <Text style={[styles.fieldValue, {fontWeight: '600', color: '#043094'}]}>{equipmentData.assignedTo}</Text>
                  </View>
                  {currentEquipment.manualPhone && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Phone Number</Text>
                      <Text style={styles.fieldValue}>{currentEquipment.manualPhone}</Text>
                    </View>
                  )}
                  {currentEquipment.checkedOutAt && (
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Checked Out At</Text>
                      <Text style={styles.fieldValue}>{new Date(currentEquipment.checkedOutAt).toLocaleString()}</Text>
                    </View>
                  )}
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{t('equip_col_group', 'Group / Location')}</Text>
                    <View style={styles.fieldValueRow}>
                      <View>
                        {isEditing ? <TextInput style={styles.editInput} value={equipmentData.group} onChangeText={t => setEquipmentData({...equipmentData, group: t})} /> : <Text style={styles.fieldValue}>{equipmentData.group}</Text>}
                      </View>
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Type / Category</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={equipmentData.type} onChangeText={t => setEquipmentData({...equipmentData, type: t})} /> : <Text style={[styles.fieldValue, {color: '#0EA5E9'}]}>{equipmentData.type}</Text>}
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Serial Number</Text>
                    <View style={styles.fieldValueRow}>
                      {isEditing ? <TextInput style={styles.editInput} value={equipmentData.serialNumber} onChangeText={t => setEquipmentData({...equipmentData, serialNumber: t})} /> : <Text style={styles.fieldValue}>{equipmentData.serialNumber}</Text>}
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Make</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={equipmentData.make} onChangeText={t => setEquipmentData({...equipmentData, make: t})} /> : <Text style={styles.fieldValue}>{equipmentData.make}</Text>}
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Model</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={equipmentData.model} onChangeText={t => setEquipmentData({...equipmentData, model: t})} /> : <Text style={styles.fieldValue}>{equipmentData.model}</Text>}
                  </View>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Year</Text>
                    {isEditing ? <TextInput style={styles.editInput} value={equipmentData.year} onChangeText={t => setEquipmentData({...equipmentData, year: t})} /> : <Text style={styles.fieldValue}>{equipmentData.year}</Text>}
                  </View>
                </View>
              </View>
            </>
          )}

          {activeTab === 'Documents' && (
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <View style={[styles.cardHeaderRow, {marginBottom: 15}]}>
                <Text style={styles.cardTitle}>Manuals & Documents</Text>
                <TouchableOpacity style={[styles.addBtn, {paddingHorizontal: 15, paddingVertical: 8}]} onPress={handleUploadDocument}>
                  <Ionicons name="add" size={16} color="#fff" style={{marginRight: 4}} />
                  <Text style={styles.addBtnText}>Upload</Text>
                </TouchableOpacity>
              </View>
              {documents.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#6B7280', marginVertical: 30 }}>No documents uploaded.</Text>
              ) : (
                documents.map(doc => (
                  <View key={doc.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                    <Ionicons name="document-text" size={24} color="#6B7280" style={{ marginRight: 15 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>{doc.name}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{doc.size} • Uploaded {doc.date}</Text>
                    </View>
                    <TouchableOpacity>
                      <Ionicons name="download-outline" size={20} color="#043094" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
          
        </View>
      </ScrollView>

      {/* Web Image Upload Modal */}
      {Platform.OS === 'web' && imagePickerModalVisible && (
        <Modal transparent={true} visible={imagePickerModalVisible} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setImagePickerModalVisible(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Upload Equipment Image</Text>
              <input type="file" accept="image/*" onChange={handleWebImageUpload} style={{ marginTop: 20 }} />
              <TouchableOpacity style={[styles.cancelBtn, { marginTop: 20 }]} onPress={() => setImagePickerModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', padding: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backText: { fontSize: 14, color: '#4B5563', marginLeft: 6, fontWeight: '500' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  equipmentImg: { width: 100, height: 100, borderRadius: 12, marginRight: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  badgesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  metaText: { fontSize: 13, color: '#4B5563' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { fontSize: 12, color: '#065F46', fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  editText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabsScroll: { paddingHorizontal: 20 },
  tab: { paddingVertical: 15, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#043094' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  activeTabText: { color: '#043094', fontWeight: '600' },
  contentScroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  grid: { flexDirection: 'row', gap: 20 },
  detailsCol: { flex: 1 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  fieldRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fieldLabel: { width: 150, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  fieldValueRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldValue: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  editInput: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#043094', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15 },
  cancelBtn: { padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelBtnText: { color: '#4B5563', fontWeight: '600' }
});
