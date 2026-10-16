import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth, useUser } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { user } = useUser();

  const [isUploading, setIsUploading] = useState(false);
  const [fleetCode, setFleetCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  // Edit Profile Modal state
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change Password Modal state
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('fleet_code, phone_number')
        .eq('id', user.id)
        .single();
      if (data) {
        if (data.fleet_code) setFleetCode(data.fleet_code);
        if (data.phone_number) setPhoneNumber(data.phone_number);
      }
    }
    loadProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setIsUploading(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;

        // Update image in Clerk
        await user?.setProfileImage({ file: base64Image });

        // Sync the image URL to Supabase profiles table
        if (user?.id) {
          await supabase.from('profiles').update({ avatar_url: user.imageUrl }).eq('id', user.id);
        }
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      if (Platform.OS === 'web') window.alert('Failed to update profile photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const openEditProfile = () => {
    setEditFirstName(user?.firstName || '');
    setEditLastName(user?.lastName || '');
    setEditPhoneNumber(phoneNumber || '');
    setIsEditProfileVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const trimmedFirst = editFirstName.trim();
    const trimmedLast = editLastName.trim();

    if (!trimmedFirst) {
      if (Platform.OS === 'web') window.alert('First name is required.');
      else Alert.alert('Error', 'First name is required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      // 1. Update Clerk names
      await user.update({
        firstName: trimmedFirst,
        lastName: trimmedLast,
      });

      // 2. Sync to Supabase profiles
      const fullName = `${trimmedFirst} ${trimmedLast}`.trim();
      const trimmedPhone = editPhoneNumber.trim();

      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: trimmedPhone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // 3. Reload Clerk user state
      await user.reload();

      setPhoneNumber(trimmedPhone);
      setIsEditProfileVisible(false);

      if (Platform.OS === 'web') {
        window.alert('Profile updated successfully!');
      } else {
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Failed to update profile.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsChangePasswordVisible(true);
  };

  const handleChangePassword = async () => {
    if (!user) return;

    const hasPassword = user.passwordEnabled !== false;

    if (hasPassword && !currentPassword) {
      if (Platform.OS === 'web') window.alert('Please enter your current password.');
      else Alert.alert('Error', 'Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      if (Platform.OS === 'web') window.alert('New password must be at least 8 characters long.');
      else Alert.alert('Error', 'New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      if (Platform.OS === 'web') window.alert('New passwords do not match.');
      else Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (hasPassword) {
        await user.updatePassword({
          currentPassword,
          newPassword,
          signOutOfOtherSessions: false,
        });
      } else {
        if (typeof (user as any).createPassword === 'function') {
          await (user as any).createPassword({ newPassword });
        } else {
          await user.updatePassword({
            newPassword,
            signOutOfOtherSessions: false,
          });
        }
      }

      setIsChangePasswordVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (Platform.OS === 'web') {
        window.alert('Password changed successfully!');
      } else {
        Alert.alert('Success', 'Password changed successfully!');
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Failed to change password.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileImageContainer} onPress={pickImage} disabled={isUploading}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageText}>
                {user?.firstName ? user.firstName.charAt(0) : 'M'}
              </Text>
            </View>
          )}

          <View style={styles.editBadge}>
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{user?.fullName || 'Manager'}</Text>
        <Text style={styles.role}>{t('m_profile_role_manager', 'Manager')}</Text>
        <Text style={styles.email}>
          {user?.primaryEmailAddress?.emailAddress || user?.primaryPhoneNumber?.phoneNumber || 'No Contact Info'}
        </Text>
        {phoneNumber ? <Text style={styles.phoneText}>{phoneNumber}</Text> : null}
      </View>

      <View style={[styles.section, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE', borderWidth: 1, padding: 20 }]}>
        <Text style={[styles.sectionTitle, { color: '#3730A3', marginBottom: 8 }]}>Fleet Invite Code</Text>
        <Text style={{ fontSize: 14, color: '#4338CA', marginBottom: 12 }}>
          Give this code to your drivers. They will enter it during their profile setup to join your fleet automatically.
        </Text>
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1E1B4B', letterSpacing: 2 }}>
            {fleetCode || '...'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('m_profile_account_settings', 'Account Settings')}</Text>

        <TouchableOpacity style={styles.row} onPress={openEditProfile}>
          <View style={styles.rowLeft}>
            <Ionicons name="person-outline" size={20} color="#4B5563" />
            <Text style={styles.rowText}>{t('m_profile_edit', 'Edit Profile')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={openChangePassword}>
          <View style={styles.rowLeft}>
            <Ionicons name="lock-closed-outline" size={20} color="#4B5563" />
            <Text style={styles.rowText}>{t('m_profile_change_password', 'Change Password')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>{t('m_profile_sign_out', 'Sign Out')}</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={isEditProfileVisible} animationType="fade" transparent onRequestClose={() => setIsEditProfileVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="person" size={20} color="#043094" />
                </View>
                <Text style={styles.modalTitle}>{t('m_profile_edit', 'Edit Profile')}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditProfileVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="Enter first name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Enter last name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPhoneNumber}
                  onChangeText={setEditPhoneNumber}
                  placeholder="e.g. +1 555 123 4567"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={[styles.textInput, styles.disabledInput]}
                  value={user?.primaryEmailAddress?.emailAddress || ''}
                  editable={false}
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.inputHint}>Email is linked to your login credentials.</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditProfileVisible(false)}
                disabled={isSavingProfile}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isSavingProfile && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={isChangePasswordVisible} animationType="fade" transparent onRequestClose={() => setIsChangePasswordVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="lock-closed" size={20} color="#D97706" />
                </View>
                <Text style={styles.modalTitle}>{t('m_profile_change_password', 'Change Password')}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsChangePasswordVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {user?.passwordEnabled !== false && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Password *</Text>
                  <View style={styles.passwordField}>
                    <TextInput
                      style={styles.passwordInput}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeBtn}>
                      <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password *</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password (min 8 chars)"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputHint}>Must be at least 8 characters long.</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsChangePasswordVisible(false)}
                disabled={isUpdatingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isUpdatingPassword && { opacity: 0.7 }]}
                onPress={handleChangePassword}
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#111827',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  role: {
    fontSize: 16,
    color: '#043094',
    fontWeight: '500',
    marginTop: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  phoneText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  eyeBtn: {
    padding: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#043094',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
