import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, useWindowDimensions, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import SummaryBox from '../../components/SummaryBox';
import { useVehicles } from '../../context/VehicleContext';
import { usePersonnel } from '../../context/PersonnelContext';

export default function DriversScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 1024;
  
  const { vehicles, updateVehicleData } = useVehicles();
  const { personnel, addPerson, updatePerson } = usePersonnel();

  const drivers = useMemo(() => personnel.filter(p => p.role === 'Driver'), [personnel]);
  const nonDrivers = useMemo(() => personnel.filter(p => p.role !== 'Driver'), [personnel]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState<'All' | 'Assigned' | 'Unassigned'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'On Leave' | 'Inactive'>('All');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [isVehicleSelectVisible, setIsVehicleSelectVisible] = useState(false);
  const [isContactSelectVisible, setIsContactSelectVisible] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // Form State
  const [form, setForm] = useState({ name: '', license: '', vehicle: '', vehicleId: '', oldDriver: '', status: 'Active', score: '100', email: '', phone: '' });
  
  // Vehicle Selection State
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<'All' | 'Unassigned'>('Unassigned');

  const availableVehicles = useMemo(() => {
    let result = vehicles;
    if (vehicleFilter === 'Unassigned') {
      result = result.filter((v: any) => !v.assignedTo || v.assignedTo === '' || v.assignedTo === 'Unassigned');
    }
    if (vehicleSearch) {
      const lower = vehicleSearch.toLowerCase();
      result = result.filter((v: any) => v.name.toLowerCase().includes(lower) || (v.vin && v.vin.toLowerCase().includes(lower)));
    }
    return result;
  }, [vehicles, vehicleSearch, vehicleFilter]);

  const filteredDrivers = useMemo(() => {
    let result = drivers;
    
    if (listFilter === 'Assigned') {
      result = result.filter(d => d.vehicle && d.vehicle !== 'Unassigned');
    } else if (listFilter === 'Unassigned') {
      result = result.filter(d => !d.vehicle || d.vehicle === 'Unassigned');
    }

    if (statusFilter !== 'All') {
      result = result.filter(d => d.status === statusFilter);
    }

    if (!searchQuery) return result;
    const lowerQuery = searchQuery.toLowerCase();
    return result.filter(d => 
      d.name.toLowerCase().includes(lowerQuery) || 
      (d.licenseExp && d.licenseExp.toLowerCase().includes(lowerQuery)) ||
      (d.vehicle && d.vehicle.toLowerCase().includes(lowerQuery))
    );
  }, [drivers, searchQuery, listFilter, statusFilter]);

  const handleAddDriver = () => {
    if (!form.name) {
      if (Platform.OS === 'web') window.alert("Please enter a name.");
      else Alert.alert("Error", "Please enter a name.");
      return;
    }

    let updatedDrivers = [...drivers];

    if (form.oldDriver) {
      const oldDriverObj = drivers.find(d => d.name === form.oldDriver);
      if (oldDriverObj) updatePerson(oldDriverObj.id, { vehicle: 'Unassigned' });
    }

    if (editingDriverId) {
      updatePerson(editingDriverId, {
        name: form.name,
        status: form.status,
        score: form.score ? parseInt(form.score) : 100,
        licenseExp: form.license || '2030-01-01',
        vehicle: form.vehicle || 'Unassigned',
      });
    } else {
      addPerson({
        name: form.name,
        role: 'Driver',
        department: 'Fleet',
        phone: form.phone,
        email: form.email,
        status: form.status,
        score: form.score ? parseInt(form.score) : 100,
        licenseExp: form.license || '2030-01-01',
        vehicle: form.vehicle || 'Unassigned',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&q=80'
      });
    }

    if (form.vehicleId) {
      updateVehicleData(form.vehicleId, { assignedTo: form.name });
    }

    setForm({ name: '', license: '', vehicle: '', vehicleId: '', oldDriver: '', status: 'Active', score: '100', email: '', phone: '' });
    setEditingDriverId(null);
    setIsModalVisible(false);
  };

  const handleSelectVehicle = (v: any) => {
    if (v.assignedTo && v.assignedTo !== 'Unassigned' && v.assignedTo !== form.name) {
      if (Platform.OS === 'web') {
        const confirm = window.confirm(`This vehicle is currently assigned to ${v.assignedTo}. Do you want to transfer it to this new driver?`);
        if (confirm) {
          setForm({...form, vehicle: v.name, vehicleId: v.id, oldDriver: v.assignedTo});
          setIsVehicleSelectVisible(false);
        }
      } else {
        Alert.alert(
          "Transfer Vehicle?",
          `This vehicle is currently assigned to ${v.assignedTo}. Do you want to transfer it to this new driver?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Yes, Transfer", onPress: () => {
                setForm({...form, vehicle: v.name, vehicleId: v.id, oldDriver: v.assignedTo});
                setIsVehicleSelectVisible(false);
            }}
          ]
        );
      }
    } else {
      setForm({...form, vehicle: v.name, vehicleId: v.id, oldDriver: ''});
      setIsVehicleSelectVisible(false);
    }
  };

  const handleAction = (driverId: string) => {
    const driverToEdit = drivers.find(d => d.id === driverId);
    if (!driverToEdit) return;
    
    setForm({
      name: driverToEdit.name,
      license: driverToEdit.licenseExp || '',
      vehicle: driverToEdit.vehicle && driverToEdit.vehicle !== 'Unassigned' ? driverToEdit.vehicle : '',
      vehicleId: '',
      oldDriver: '',
      status: driverToEdit.status || 'Active',
      score: driverToEdit.score?.toString() || '100',
      email: driverToEdit.email || '',
      phone: driverToEdit.phone || ''
    });
    setEditingDriverId(driverId);
    setIsModalVisible(true);
  };

  const handleExport = () => {
    const csvData = "ID,Name,Status,Vehicle,License Exp,Score\n" + 
      filteredDrivers.map(d => `${d.id},${d.name},${d.status},${d.vehicle},${d.licenseExp},${d.score}`).join('\n');
      
    if (Platform.OS === 'web') {
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drivers_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      Alert.alert("Exported", "Drivers list has been exported to your documents.");
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/vnd.ms-excel', 'text/*'] });
      if (result.canceled) return;
      
      addPerson({ 
        name: 'New Imported Driver', 
        role: 'Driver',
        department: 'Fleet',
        phone: '(555) 000-0000',
        email: 'imported@example.com',
        status: 'Active', 
        vehicle: 'Unassigned', 
        licenseExp: '2026-01-01', 
        score: 100, 
        avatar: 'https://i.pravatar.cc/150?u=' + Math.random() 
      });
      
      if (Platform.OS === 'web') {
        window.alert(`Successfully imported drivers from ${result.assets[0].name}`);
      } else {
        Alert.alert("Import Successful", `Drivers imported from ${result.assets[0].name}`);
      }
    } catch(e) {
      if (Platform.OS === 'web') {
        window.alert("Could not read the import file.");
      } else {
        Alert.alert("Import Failed", "Could not read the file.");
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Header Area */}
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
        <View>
          <Text style={styles.pageTitle}>Drivers</Text>
          <Text style={styles.pageSubtitle}>Manage your fleet personnel and compliance</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Add Driver</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <SummaryBox items={[
        { label: 'Total', count: drivers.length, icon: 'people', color: '#ffffff' },
        { label: 'Active', count: drivers.filter(d => d.status === 'Active').length, icon: 'checkmark-circle', color: '#34D399' },
        { label: 'On Leave', count: drivers.filter(d => d.status === 'On Leave').length, icon: 'time', color: '#F59E0B' },
        { label: 'Inactive', count: drivers.filter(d => d.status === 'Inactive').length, icon: 'close-circle', color: '#F87171' }
      ]} />

      {/* Driver List Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={[styles.vehicleTabs, { marginBottom: 0 }]}>
          <TouchableOpacity 
            style={[styles.vehicleTab, listFilter === 'All' && styles.activeVehicleTab]}
            onPress={() => setListFilter('All')}
          >
            <Text style={[styles.vehicleTabText, listFilter === 'All' && styles.activeVehicleTabText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.vehicleTab, listFilter === 'Assigned' && styles.activeVehicleTab]}
            onPress={() => setListFilter('Assigned')}
          >
            <Text style={[styles.vehicleTabText, listFilter === 'Assigned' && styles.activeVehicleTabText]}>Assigned</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.vehicleTab, listFilter === 'Unassigned' && styles.activeVehicleTab]}
            onPress={() => setListFilter('Unassigned')}
          >
            <Text style={[styles.vehicleTabText, listFilter === 'Unassigned' && styles.activeVehicleTabText]}>Unassigned</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search drivers by name, license, or vehicle..." 
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            // @ts-ignore
            outlineStyle="none"
          />
        </View>
        <View style={styles.filterGroup}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setIsFilterModalVisible(true)}>
            <Ionicons name="filter-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>Filters {statusFilter !== 'All' ? `(${statusFilter})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={handleImport}>
            <Ionicons name="cloud-upload-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Table / List */}
      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Driver</Text>
            <Text style={[styles.th, { flex: 1 }]}>Status</Text>
            <Text style={[styles.th, { flex: 2 }]}>Assigned Vehicle</Text>
            <Text style={[styles.th, { flex: 1 }]}>License Exp.</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Safety Score</Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {filteredDrivers.map((driver, index) => (
          <TouchableOpacity 
            key={driver.id} 
            style={[styles.tableRow, isMobile && styles.tableRowMobile, index === filteredDrivers.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => router.push(`/(manager)/drivers/${driver.id}` as any)}
          >
            
            {/* Driver Info */}
            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && { width: '100%', marginBottom: 15 }]}>
              <View style={styles.driverInfo}>
                <Image source={{ uri: driver.avatar }} style={styles.avatar} />
                <View>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverId}>{driver.id}</Text>
                </View>
              </View>
            </View>

            {/* Status */}
            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Status</Text>}
              <View style={[
                styles.statusBadge, 
                driver.status === 'Active' ? styles.statusActive : 
                driver.status === 'On Leave' ? styles.statusWarning : 
                styles.statusInactive
              ]}>
                <Text style={[
                  styles.statusText,
                  driver.status === 'Active' ? styles.statusActiveText : 
                  driver.status === 'On Leave' ? styles.statusWarningText : 
                  styles.statusInactiveText
                ]}>{driver.status}</Text>
              </View>
            </View>

            {/* Vehicle */}
            <View style={[styles.td, { flex: isMobile ? undefined : 2 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Vehicle</Text>}
              <Text style={styles.cellText}>{driver.vehicle}</Text>
            </View>

            {/* License */}
            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>License Exp.</Text>}
              <Text style={styles.cellText}>{driver.licenseExp}</Text>
            </View>

            {/* Score */}
            <View style={[styles.td, { flex: isMobile ? undefined : 1, alignItems: isMobile ? 'flex-end' : 'center' }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Score</Text>}
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreText}>{driver.score}</Text>
              </View>
            </View>

            {/* Actions */}
            {!isMobile && (
              <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={() => handleAction(driver.id)}>
                <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
            
          </TouchableOpacity>
        ))}
      </View>
      
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, (isVehicleSelectVisible || isContactSelectVisible) && { height: '80%', maxHeight: 600 }]}>
            
            {isVehicleSelectVisible ? (
              // Vehicle Selection View
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Vehicle</Text>
                  <TouchableOpacity onPress={() => setIsVehicleSelectVisible(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={{ padding: 20, flex: 1 }}>
                  <View style={styles.vehicleTabs}>
                    <TouchableOpacity 
                      style={[styles.vehicleTab, vehicleFilter === 'Unassigned' && styles.activeVehicleTab]}
                      onPress={() => setVehicleFilter('Unassigned')}
                    >
                      <Text style={[styles.vehicleTabText, vehicleFilter === 'Unassigned' && styles.activeVehicleTabText]}>Unassigned</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.vehicleTab, vehicleFilter === 'All' && styles.activeVehicleTab]}
                      onPress={() => setVehicleFilter('All')}
                    >
                      <Text style={[styles.vehicleTabText, vehicleFilter === 'All' && styles.activeVehicleTabText]}>All Vehicles</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.searchBox, { marginBottom: 15, flex: 0 }]}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput 
                      style={styles.searchInput} 
                      placeholder="Search vehicles..." 
                      value={vehicleSearch}
                      onChangeText={setVehicleSearch}
                    />
                  </View>

                  <ScrollView style={{ flex: 1 }}>
                    {availableVehicles.length === 0 ? (
                      <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 20 }}>No vehicles found.</Text>
                    ) : (
                      availableVehicles.map((v: any) => (
                        <TouchableOpacity 
                          key={v.id} 
                          style={styles.vehicleOptionCard}
                          onPress={() => handleSelectVehicle(v)}
                        >
                          <Image source={{uri: v.image}} style={styles.vehicleOptionImg} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.vehicleOptionName}>{v.name}</Text>
                            <Text style={styles.vehicleOptionDetail}>{v.year} {v.make} {v.model}</Text>
                            {v.assignedTo && v.assignedTo !== 'Unassigned' && (
                              <Text style={styles.vehicleOptionAssigned}>Currently assigned to: {v.assignedTo}</Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              </>
            ) : isContactSelectVisible ? (
              // Contact Selection Sub-Modal
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Import from Contacts</Text>
                  <TouchableOpacity onPress={() => setIsContactSelectVisible(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={{ padding: 20, flex: 1 }}>
                  <View style={[styles.searchBox, { marginBottom: 15, flex: 0 }]}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput 
                      style={styles.searchInput} 
                      placeholder="Search drivers by name, email, or phone..." 
                      value={contactSearchQuery}
                      onChangeText={setContactSearchQuery}
                    />
                  </View>

                  <ScrollView style={{ flex: 1 }}>
                    {nonDrivers
                    .filter(c => {
                      if (!contactSearchQuery) return true;
                      const q = contactSearchQuery.toLowerCase();
                      return c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q);
                    })
                    .map((contact) => {
                      const existingDriver = drivers.find(d => d.name === contact.name);
                      const isAssigned = existingDriver && existingDriver.vehicle && existingDriver.vehicle !== 'Unassigned';
                      
                      return (
                        <TouchableOpacity 
                          key={contact.id} 
                          style={[styles.vehicleOptionCard, existingDriver && { opacity: 0.6 }]}
                          onPress={() => {
                            if (existingDriver) {
                              if (Platform.OS === 'web') window.alert("This driver has already been added.");
                              else Alert.alert("Already Added", "This driver has already been added.");
                              return;
                            }
                            setForm({...form, name: contact.name, phone: contact.phone, email: contact.email});
                            setIsContactSelectVisible(false);
                          }}
                        >
                          <Image source={{uri: contact.avatar}} style={styles.avatar} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.vehicleOptionName}>{contact.name}</Text>
                            <Text style={styles.vehicleOptionDetail}>{contact.role} • {contact.phone} • {contact.email}</Text>
                            {existingDriver && (
                              <Text style={[styles.vehicleOptionAssigned, isAssigned ? { color: '#059669' } : { color: '#D97706' }]}>
                                {isAssigned ? `Currently Assigned to: ${existingDriver.vehicle}` : 'Added (Unassigned)'}
                              </Text>
                            )}
                          </View>
                          {!existingDriver && <Ionicons name="download-outline" size={20} color="#043094" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </>
            ) : (
              // Normal Add Driver Form
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingDriverId ? 'Edit Driver' : 'Add New Driver'}</Text>
                  <TouchableOpacity onPress={() => {
                    setIsModalVisible(false);
                    setEditingDriverId(null);
                    setForm({ name: '', license: '', vehicle: '', vehicleId: '', oldDriver: '', status: 'Active', score: '100', email: '', phone: '' });
                  }}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 }}>
                    <TouchableOpacity style={styles.importContactBtn} onPress={() => setIsContactSelectVisible(true)}>
                      <Ionicons name="people-outline" size={16} color="#043094" />
                      <Text style={styles.importContactBtnText}>Import from Contacts</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({...form, name: t})} placeholder="e.g. Jane Doe" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput style={styles.input} value={form.email} onChangeText={(t) => setForm({...form, email: t})} placeholder="e.g. janedoe@company.com" keyboardType="email-address" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} placeholder="e.g. (555) 123-4567" keyboardType="phone-pad" />
                  </View>
                  
                  <View style={[styles.formGroup, { marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                    <Text style={styles.label}>License Number</Text>
                    <TextInput style={styles.input} value={form.license} onChangeText={(t) => setForm({...form, license: t})} placeholder="e.g. CDL-12345" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Assigned Vehicle</Text>
                    <TouchableOpacity style={styles.vehicleSelectBtn} onPress={() => setIsVehicleSelectVisible(true)}>
                      <Text style={[styles.vehicleSelectBtnText, !form.vehicle && { color: '#9CA3AF' }]}>{form.vehicle || 'Select a Vehicle'}</Text>
                      <Ionicons name="car-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Initial Safety Score</Text>
                    <TextInput style={styles.input} value={form.score} onChangeText={(t) => setForm({...form, score: t})} keyboardType="numeric" placeholder="100" />
                  </View>
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelModalBtn} onPress={() => {
                    setIsModalVisible(false);
                    setEditingDriverId(null);
                    setForm({ name: '', license: '', vehicle: '', vehicleId: '', oldDriver: '', status: 'Active', score: '100', email: '', phone: '' });
                  }}>
                    <Text style={styles.cancelModalBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddDriver}>
                    <Text style={styles.saveModalBtnText}>{editingDriverId ? 'Save Changes' : 'Save Driver'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>


      {/* Filter Modal */}
      <Modal visible={isFilterModalVisible} transparent animationType="slide">
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Drivers</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>By Status:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {['All', 'Active', 'On Leave', 'Inactive'].map(status => (
                  <TouchableOpacity 
                    key={status} 
                    style={[
                      styles.filterOption, 
                      statusFilter === status && styles.filterOptionActive
                    ]}
                    onPress={() => setStatusFilter(status as any)}
                  >
                    <Text style={[
                      styles.filterOptionText, 
                      statusFilter === status && styles.filterOptionTextActive
                    ]}>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity style={styles.applyBtn} onPress={() => setIsFilterModalVisible(false)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#043094',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statsGridMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardMobile: {
    width: '100%',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
    minWidth: 250,
    maxWidth: 400,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#111827',
    outlineStyle: 'none'
  } as any,
  filterGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
  },
  filterBtnText: {
    color: '#4B5563',
    fontWeight: '500',
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  th: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 20,
  },
  td: {
    justifyContent: 'center',
  },
  mobileDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  mobileLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  driverId: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusActiveText: {
    color: '#059669',
  },
  statusWarningText: {
    color: '#D97706',
  },
  statusInactiveText: {
    color: '#4B5563',
  },
  cellText: {
    fontSize: 14,
    color: '#374151',
  },
  scoreCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  vehicleSelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vehicleSelectBtnText: {
    fontSize: 14,
    color: '#111827',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelModalBtnText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  saveModalBtn: {
    backgroundColor: '#043094',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveModalBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  vehicleTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  vehicleTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeVehicleTab: {
    borderBottomColor: '#043094',
  },
  vehicleTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeVehicleTabText: {
    color: '#043094',
  },
  vehicleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 10,
  },
  vehicleOptionImg: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  vehicleOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  vehicleOptionDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  vehicleOptionAssigned: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 4,
  },
  importContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  importContactBtnText: {
    color: '#043094',
    fontSize: 13,
    fontWeight: '500',
  },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30 },
  filterOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  filterOptionActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  filterOptionText: { color: '#4B5563', fontSize: 14 },
  filterOptionTextActive: { color: '#1D4ED8', fontWeight: '600' },
  applyBtn: { backgroundColor: '#043094', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
});
