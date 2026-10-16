import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, useWindowDimensions, Alert, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { useUser } from '@clerk/expo';
import { supabase } from '../../lib/supabase';
import SummaryBox from '../../components/SummaryBox';
import { useVehicles } from '../../context/VehicleContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { useSearch } from '../../context/SearchContext';
import { useTranslation } from 'react-i18next';

export default function DriversScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 1024;
  
  const { vehicles, updateVehicleData } = useVehicles();
  const { personnel, addPerson, updatePerson } = usePersonnel();

  const drivers = useMemo(() => personnel.filter(p => p.role === 'Driver' && p.isProfile), [personnel]);
  const nonDrivers = useMemo(() => personnel.filter(p => !p.isProfile), [personnel]);
  
  const { searchQuery, setSearchQuery } = useSearch();
  const [listFilter, setListFilter] = useState<'All' | 'Assigned' | 'Unassigned'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'On Leave' | 'Inactive' | 'Pending'>('All');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [isApproveMode, setIsApproveMode] = useState(false);
  const [isVehicleSelectVisible, setIsVehicleSelectVisible] = useState(false);
  const [isContactSelectVisible, setIsContactSelectVisible] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  const { user } = useUser();
  const [fleetCode, setFleetCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  useEffect(() => {
    async function loadFleetCode() {
      if (!user?.id) return;
      if (user?.unsafeMetadata?.fleetCode && typeof user.unsafeMetadata.fleetCode === 'string') {
        setFleetCode(user.unsafeMetadata.fleetCode);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('fleet_code')
          .eq('id', user.id)
          .maybeSingle();
        if (data?.fleet_code) {
          setFleetCode(data.fleet_code);
        }
      } catch (e) {
        console.error('Error fetching manager fleet_code:', e);
      }
    }
    loadFleetCode();
  }, [user?.id, user?.unsafeMetadata?.fleetCode]);

  const handleCopyCode = async () => {
    if (!fleetCode) return;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(fleetCode);
      } else {
        await Clipboard.setStringAsync(fleetCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy fleet code:', e);
    }
  };

  const handleCopyInviteMessage = async () => {
    if (!fleetCode) return;
    const msg = `Join our fleet on Aviance! Download the Aviance Driver App, register your account, and enter our Fleet Join Code: ${fleetCode} to connect with our fleet manager.`;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(msg);
      } else {
        await Clipboard.setStringAsync(msg);
      }
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch (e) {
      console.error('Failed to copy invite message:', e);
    }
  };

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

  const formatLicenseExp = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === '') return { text: '—', color: '#9CA3AF', isUrgent: false };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { text: dateStr, color: '#374151', isUrgent: false };
      
      const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffTime = d.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { text: `${formatted} (Expired)`, color: '#EF4444', isUrgent: true };
      }
      if (diffDays <= 30) {
        return { text: `${formatted} (${diffDays}d left)`, color: '#D97706', isUrgent: true };
      }
      return { text: formatted, color: '#374151', isUrgent: false };
    } catch {
      return { text: dateStr, color: '#374151', isUrgent: false };
    }
  };

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
        avatar: ''
      });
    }

    if (form.vehicleId) {
      updateVehicleData(form.vehicleId, { 
        assignedTo: form.name,
        current_driver_id: editingDriverId // This is the UUID/TEXT id for the profile
      });
    }

    setForm({ name: '', license: '', vehicle: '', vehicleId: '', oldDriver: '', status: 'Active', score: '100', email: '', phone: '' });
    setEditingDriverId(null);
    setIsApproveMode(false);
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

  const handleApprove = (driverId: string) => {
    handleAction(driverId);
    setForm(prev => ({ ...prev, status: 'Active' }));
    setIsApproveMode(true);
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
        avatar: '' 
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
          <Text style={styles.pageTitle}>{t('nav_drivers', 'Drivers')}</Text>
          <Text style={styles.pageSubtitle}>{t('driver_subtitle', 'Manage your fleet personnel and compliance')}</Text>
        </View>
        <TouchableOpacity 
          style={styles.primaryBtn} 
          onPress={() => setIsInviteModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>Invite Driver</Text>
        </TouchableOpacity>
      </View>

      {/* Driver Self-Registration Banner */}
      <View style={[styles.inviteBanner, isMobile && styles.inviteBannerMobile]}>
        <View style={styles.inviteBannerLeft}>
          <View style={styles.inviteIconCircle}>
            <Ionicons name="key" size={22} color="#043094" />
          </View>
          <View style={styles.inviteTextContainer}>
            <View style={styles.inviteTitleRow}>
              <Text style={styles.inviteBannerTitle}>Driver Self-Registration Code</Text>
              <View style={styles.inviteActiveBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.inviteActiveText}>ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.inviteBannerDesc}>
              Drivers can download the Driver App, create an account, and enter this code to join your fleet automatically.
            </Text>
          </View>
        </View>

        <View style={[styles.inviteBannerRight, isMobile && styles.inviteBannerRightMobile]}>
          <View style={styles.codeDisplayContainer}>
            <Text style={styles.codeDisplayLabel}>FLEET CODE</Text>
            <Text style={styles.codeDisplayText}>{fleetCode || 'Generating...'}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.copyCodeBtn, copied && styles.copyCodeBtnSuccess]} 
            onPress={handleCopyCode}
            activeOpacity={0.8}
          >
            <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.copyCodeBtnText}>{copied ? "Copied!" : "Copy Code"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.howItWorksBtn} 
            onPress={() => setIsInviteModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle-outline" size={16} color="#043094" style={{ marginRight: 5 }} />
            <Text style={styles.howItWorksBtnText}>How it Works</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <SummaryBox items={[
        { label: t('driver_stat_total', 'Total'), count: drivers.length, icon: 'people', color: '#ffffff' },
        { label: t('driver_stat_active', 'Active'), count: drivers.filter(d => d.status === 'Active').length, icon: 'checkmark-circle', color: '#34D399' },
        { label: t('driver_stat_pending', 'Pending'), count: drivers.filter(d => d.status === 'Pending').length, icon: 'hourglass', color: '#6366F1' },
        { label: t('driver_stat_inactive', 'Inactive'), count: drivers.filter(d => d.status === 'Inactive' || d.status === 'On Leave').length, icon: 'close-circle', color: '#F87171' }
      ]} />

      {/* Driver List Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={[styles.vehicleTabs, { marginBottom: 0 }]}>
          <TouchableOpacity 
            style={[styles.vehicleTab, listFilter === 'All' && styles.activeVehicleTab]}
            onPress={() => setListFilter('All')}
          >
            <Text style={[styles.vehicleTabText, listFilter === 'All' && styles.activeVehicleTabText]}>{t('veh_tab_all', 'All')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.vehicleTab, listFilter === 'Assigned' && styles.activeVehicleTab]}
            onPress={() => setListFilter('Assigned')}
          >
            <Text style={[styles.vehicleTabText, listFilter === 'Assigned' && styles.activeVehicleTabText]}>{t('veh_tab_assigned', 'Assigned')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.vehicleTab, listFilter === 'Unassigned' && styles.activeVehicleTab]}
            onPress={() => setListFilter('Unassigned')}
          >
            <Text style={[styles.vehicleTabText, listFilter === 'Unassigned' && styles.activeVehicleTabText]}>{t('veh_tab_unassigned', 'Unassigned')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            style={styles.searchInput} 
            placeholder={t('driver_search', 'Search drivers by name, license, or vehicle...')} 
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
            <Text style={styles.filterBtnText}>{t('veh_filters', 'Filters')} {statusFilter !== 'All' ? `(${t(`driver_stat_${statusFilter.toLowerCase().replace(' ', '_')}`, statusFilter)})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={handleImport}>
            <Ionicons name="cloud-upload-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>{t('driver_import', 'Import')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={18} color="#4B5563" />
            <Text style={styles.filterBtnText}>{t('driver_export', 'Export')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Data Table / List */}
      <View style={styles.card}>
        {!isMobile && (
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>{t('driver_col_driver', 'Driver')}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{t('veh_col_status', 'Status')}</Text>
            <Text style={[styles.th, { flex: 2 }]}>{t('driver_col_assigned_vehicle', 'Assigned Vehicle')}</Text>
            <Text style={[styles.th, { flex: 1 }]}>{t('driver_col_license', 'License Exp.')}</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('driver_col_score', 'Safety Score')}</Text>
            <View style={{ width: 100 }} />
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
                {driver.avatar ? (
                  <Image source={{ uri: driver.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="person" size={24} color="#9CA3AF" />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.driverName} numberOfLines={1}>{driver.name}</Text>
                  {driver.phone ? <Text style={styles.driverId} numberOfLines={1}>{driver.phone}</Text> : null}
                </View>
              </View>
            </View>

            {/* Status */}
            <View style={[styles.td, { flex: isMobile ? undefined : 1 }, isMobile && styles.mobileDataRow]}>
              {isMobile && <Text style={styles.mobileLabel}>Status</Text>}
              <View style={[
                styles.statusBadge, 
                driver.status === 'Active' ? styles.statusActive : 
                driver.status === 'Pending' ? { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' } :
                driver.status === 'On Leave' ? styles.statusWarning : 
                styles.statusInactive
              ]}>
                <Text style={[
                  styles.statusText,
                  driver.status === 'Active' ? styles.statusActiveText : 
                  driver.status === 'Pending' ? { color: '#4F46E5' } :
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
              {(() => {
                const info = formatLicenseExp(driver.licenseExp);
                return (
                  <Text style={[styles.cellText, { color: info.color, fontWeight: info.isUrgent ? '600' : '400' }]}>
                    {info.text}
                  </Text>
                );
              })()}
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
              <View style={{ width: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                {driver.status === 'Pending' && (
                  <TouchableOpacity 
                    style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }} 
                    onPress={() => handleApprove(driver.id)}
                  >
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Approve</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={{ width: 40, alignItems: 'center' }} onPress={() => handleAction(driver.id)}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
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
                  <Text style={styles.modalTitle}>{t('driver_select_vehicle', 'Select Vehicle')}</Text>
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
                      <Text style={[styles.vehicleTabText, vehicleFilter === 'All' && styles.activeVehicleTabText]}>{t('driver_tab_all_vehicles', 'All Vehicles')}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.searchBox, { marginBottom: 15, flex: 0 }]}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput 
                      style={styles.searchInput} 
                      placeholder={t('driver_search_vehicles', 'Search vehicles...')} 
                      value={vehicleSearch}
                      onChangeText={setVehicleSearch}
                    />
                  </View>

                  <ScrollView style={{ flex: 1 }}>
                    {availableVehicles.length === 0 ? (
                      <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 20 }}>{t('driver_no_vehicles', 'No vehicles found.')}</Text>
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
                  <Text style={styles.modalTitle}>{t('driver_import_contacts', 'Import from Contacts')}</Text>
                  <TouchableOpacity onPress={() => setIsContactSelectVisible(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={{ padding: 20, flex: 1 }}>
                  <View style={[styles.searchBox, { marginBottom: 15, flex: 0 }]}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput 
                      style={styles.searchInput} 
                      placeholder={t('driver_search_contacts', 'Search drivers by name, email, or phone...')} 
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
                  <Text style={styles.modalTitle}>
                    {isApproveMode ? t('driver_approve_title', 'Approve Driver') : editingDriverId ? t('driver_edit_title', 'Edit Driver') : t('driver_add_title', 'Add New Driver')}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    setIsModalVisible(false);
                    setEditingDriverId(null);
                    setIsApproveMode(false);
                    setForm({ name: '', license: '', vehicle: '', vehicleId: '', oldDriver: '', status: 'Active', score: '100', email: '', phone: '' });
                  }}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 }}>
                    <TouchableOpacity style={styles.importContactBtn} onPress={() => setIsContactSelectVisible(true)}>
                      <Ionicons name="people-outline" size={16} color="#043094" />
                      <Text style={styles.importContactBtnText}>{t('driver_import_contacts', 'Import from Contacts')}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('driver_lbl_name', 'Full Name *')}</Text>
                    <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({...form, name: t})} placeholder="e.g. Jane Doe" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('driver_lbl_email', 'Email Address')}</Text>
                    <TextInput style={styles.input} value={form.email} onChangeText={(t) => setForm({...form, email: t})} placeholder="e.g. janedoe@company.com" keyboardType="email-address" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('driver_lbl_phone', 'Phone Number')}</Text>
                    <TextInput style={styles.input} value={form.phone} onChangeText={(t) => setForm({...form, phone: t})} placeholder="e.g. (555) 123-4567" keyboardType="phone-pad" />
                  </View>
                  
                  <View style={[styles.formGroup, { marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                    <Text style={styles.label}>{t('driver_lbl_license', 'License Number')}</Text>
                    <TextInput style={styles.input} value={form.license} onChangeText={(t) => setForm({...form, license: t})} placeholder="e.g. CDL-12345" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('driver_lbl_vehicle', 'Assigned Vehicle')}</Text>
                    <TouchableOpacity style={styles.vehicleSelectBtn} onPress={() => setIsVehicleSelectVisible(true)}>
                      <Text style={[styles.vehicleSelectBtnText, !form.vehicle && { color: '#9CA3AF' }]}>{form.vehicle || t('driver_placeholder_vehicle', 'Select a Vehicle')}</Text>
                      <Ionicons name="car-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>{t('driver_lbl_score', 'Initial Safety Score')}</Text>
                    <TextInput style={styles.input} value={form.score} onChangeText={(t) => setForm({...form, score: t})} keyboardType="numeric" placeholder="100" />
                  </View>
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelModalBtn} onPress={() => {
                    setIsModalVisible(false);
                    setEditingDriverId(null);
                    setIsApproveMode(false);
                    setForm({ name: '', license: '', vehicle: '', vehicleId: '', oldDriver: '', status: 'Active', score: '100', email: '', phone: '' });
                  }}>
                    <Text style={styles.cancelModalBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddDriver}>
                    <Text style={styles.saveModalBtnText}>
                      {isApproveMode ? t('driver_approve_btn', 'Approve & Save') : editingDriverId ? t('driver_save_changes', 'Save Changes') : t('driver_save_driver', 'Save Driver')}
                    </Text>
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
              <Text style={styles.modalTitle}>{t('driver_filter_title', 'Filter Drivers')}</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>{t('driver_filter_by_status', 'By Status:')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                {['All', 'Active', 'Pending', 'On Leave', 'Inactive'].map(status => (
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
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('veh_apply_filters', 'Apply Filters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Driver Invite Instructions Modal */}
      <Modal visible={isInviteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.inviteModalContainer}>
            <View style={styles.inviteModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.inviteModalIcon}>
                  <Ionicons name="paper-plane" size={20} color="#043094" />
                </View>
                <Text style={styles.inviteModalTitle}>Invite Drivers to Fleet</Text>
              </View>
              <TouchableOpacity onPress={() => setIsInviteModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.inviteModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inviteModalSub}>
                Drivers can create their own accounts on the Driver App and connect directly to your fleet using your code:
              </Text>

              {/* Code Box */}
              <View style={styles.modalCodeCard}>
                <Text style={styles.modalCodeLabel}>YOUR FLEET INVITE CODE</Text>
                <Text style={styles.modalCodeValue}>{fleetCode || 'AV-XXXXXX'}</Text>
                <TouchableOpacity 
                  style={[styles.modalCopyBtn, copied && styles.modalCopyBtnDone]} 
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalCopyBtnText}>{copied ? "Code Copied to Clipboard!" : "Copy Fleet Code"}</Text>
                </TouchableOpacity>
              </View>

              {/* Step-by-Step Flow */}
              <View style={styles.stepsContainer}>
                <Text style={styles.stepsHeading}>How Drivers Join:</Text>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>1</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Download Aviance Driver App</Text>
                    <Text style={styles.stepDesc}>Driver downloads or opens the Aviance Driver application.</Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>2</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Create Account & Input Code</Text>
                    <Text style={styles.stepDesc}>Driver signs up with their email and enters your Fleet Code {fleetCode || 'AV-XXXXXX'}.</Text>
                  </View>
                </View>

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>3</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Instant Fleet Connection</Text>
                    <Text style={styles.stepDesc}>The driver immediately appears here in your Drivers list ready for vehicle assignment and dispatch!</Text>
                  </View>
                </View>
              </View>

              {/* Ready-to-send Message */}
              <View style={styles.messageBox}>
                <Text style={styles.messageBoxLabel}>Ready-to-Send Invite Message</Text>
                <Text style={styles.messageBoxText}>
                  {`Join our fleet on Aviance! Download the Aviance Driver App, register your account, and enter our Fleet Join Code: ${fleetCode} to link with our fleet manager.`}
                </Text>
                <TouchableOpacity 
                  style={[styles.copyMessageBtn, copiedMessage && styles.copyMessageBtnDone]} 
                  onPress={handleCopyInviteMessage}
                  activeOpacity={0.8}
                >
                  <Ionicons name={copiedMessage ? "checkmark-circle" : "chatbubble-ellipses-outline"} size={16} color={copiedMessage ? "#059669" : "#1E40AF"} style={{ marginRight: 6 }} />
                  <Text style={[styles.copyMessageBtnText, copiedMessage && { color: '#059669' }]}>
                    {copiedMessage ? "Message Copied!" : "Copy Invite Message"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Optional Manual Fallback */}
              <View style={styles.manualFallbackSection}>
                <Text style={styles.manualFallbackTitle}>Alternative: Offline / Contractor Driver</Text>
                <Text style={styles.manualFallbackDesc}>
                  If your driver does not have a smartphone or won't be using the driver app, you can manually enter their profile into your fleet roster.
                </Text>
                <TouchableOpacity 
                  style={styles.manualAddBtn} 
                  onPress={() => {
                    setIsInviteModalVisible(false);
                    router.push('/(manager)/drivers/new' as any);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add-outline" size={16} color="#4B5563" style={{ marginRight: 6 }} />
                  <Text style={styles.manualAddBtnText}>Add Driver Profile Manually</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.inviteModalFooter}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setIsInviteModalVisible(false)}>
                <Text style={styles.closeModalBtnText}>Done</Text>
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
    minWidth: 0,
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
    minWidth: 0,
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
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
    flexShrink: 0,
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
  
  // Secondary Header Btn
  secondaryHeaderBtn: {
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryHeaderBtnText: {
    color: '#043094',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },

  // Invite Banner Styles
  inviteBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inviteBannerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 16,
  },
  inviteBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  inviteIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  inviteTextContainer: {
    flex: 1,
  },
  inviteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  inviteBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  inviteActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  inviteActiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  inviteBannerDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  inviteBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteBannerRightMobile: {
    width: '100%',
    flexWrap: 'wrap',
  },
  codeDisplayContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  codeDisplayLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  codeDisplayText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#043094',
    letterSpacing: 1,
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043094',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyCodeBtnSuccess: {
    backgroundColor: '#16A34A',
  },
  copyCodeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  howItWorksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  howItWorksBtnText: {
    color: '#043094',
    fontWeight: '600',
    fontSize: 13,
  },

  // Invite Modal Styles
  inviteModalContainer: {
    width: '90%',
    maxWidth: 540,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: '90%',
  },
  inviteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inviteModalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 6,
  },
  inviteModalBody: {
    padding: 20,
  },
  inviteModalSub: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalCodeCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalCodeValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#043094',
    letterSpacing: 2,
    marginBottom: 12,
  },
  modalCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043094',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCopyBtnDone: {
    backgroundColor: '#16A34A',
  },
  modalCopyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  stepsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  stepsHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  messageBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  messageBoxText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  copyMessageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  copyMessageBtnDone: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  copyMessageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  inviteModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'flex-end',
  },
  closeModalBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeModalBtnText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  manualFallbackSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  manualFallbackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  manualFallbackDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 12,
  },
  manualAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
  },
  manualAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
});
