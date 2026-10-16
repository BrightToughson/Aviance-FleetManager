import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, Alert, ScrollView, TextInput, KeyboardAvoidingView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';

export default function AddDriverScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 1024;
  
  const [activeTab, setActiveTab] = useState<'invite' | 'manual'>('invite');
  
  // Manual Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // In a real app, this would be fetched from the manager's organization/fleet settings in Supabase
  const fleetCode = "AVI-8492";

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(fleetCode);
    if (Platform.OS === 'web') {
      window.alert('Fleet Code copied to clipboard!');
    } else {
      Alert.alert('Copied!', 'Fleet Code copied to clipboard.');
    }
  };

  const handleShareLink = () => {
    // In a real app, this would point to your production URL like https://app.aviancefleet.com/join/
    const inviteLink = `http://localhost:8081/sign-up?fleet=${fleetCode}`;
    const shareText = `Join my fleet on Aviance! Click this link to create your driver account: ${inviteLink}`;
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(shareText);
      window.alert('Invite link copied to clipboard!');
    } else {
      Alert.alert('Share Link', shareText);
    }
  };

  const handleManualSubmit = async () => {
    if (!firstName || !lastName || !email) {
      if (Platform.OS === 'web') window.alert("Please fill in all required fields.");
      else Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      // NOTE: Because of CORS restrictions with Clerk in the browser, and because
      // Expo API routes crashed the Metro bundler, we are temporarily mocking
      // the success of this button so you can continue building your UI!
      // In production, this will be handled by your Supabase Edge Function.
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Mock Driver Created:", { firstName, lastName, email, phone, fleetCode });

      if (Platform.OS === 'web') {
        window.alert(`Driver ${firstName} ${lastName} added successfully! (Mocked)`);
        router.replace('/(manager)/drivers');
      } else {
        Alert.alert('Success', `Driver ${firstName} ${lastName} added successfully! (Mocked)`, [
          { text: 'OK', onPress: () => router.replace('/(manager)/drivers') }
        ]);
      }
      
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${err.message}`);
      } else {
        Alert.alert('Error', err.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(manager)/drivers')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#043094" />
            <Text style={styles.backBtnText}>Back to Drivers</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Add Drivers</Text>
          <Text style={styles.pageSubtitle}>Grow your fleet by inviting drivers or creating their accounts manually.</Text>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'invite' && styles.activeTabBtn]} 
              onPress={() => setActiveTab('invite')}
            >
              <Ionicons name="link-outline" size={18} color={activeTab === 'invite' ? '#fff' : '#6B7280'} />
              <Text style={[styles.tabBtnText, activeTab === 'invite' && styles.activeTabText]}>Invite via Link</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabBtn, activeTab === 'manual' && styles.activeTabBtn]} 
              onPress={() => setActiveTab('manual')}
            >
              <Ionicons name="person-add-outline" size={18} color={activeTab === 'manual' ? '#fff' : '#6B7280'} />
              <Text style={[styles.tabBtnText, activeTab === 'manual' && styles.activeTabText]}>Add Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainLayout, !isMobile && activeTab === 'invite' && styles.desktopLayout]}>
          
          {activeTab === 'invite' ? (
            <>
              <View style={styles.card}>
                <View style={styles.iconCircle}>
                  <Ionicons name="link-outline" size={40} color="#043094" />
                </View>
                <Text style={styles.cardTitle}>Your Fleet Invite Link</Text>
                <Text style={styles.cardDescription}>
                  Share this invite link with your drivers. They can sign up on their phone or computer, and will be automatically added to your fleet.
                </Text>

                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{fleetCode}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                    <Ionicons name="copy-outline" size={20} color="#043094" />
                    <Text style={styles.copyBtnText}>Copy Code</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleShareLink}>
                    <Ionicons name="share-social-outline" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Copy Invite Link</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsTitle}>How it works</Text>
                
                <View style={styles.step}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Driver clicks the link</Text>
                    <Text style={styles.stepDesc}>The driver clicks your custom invite link and creates their Aviance account on the web.</Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Downloads the app</Text>
                    <Text style={styles.stepDesc}>After signing up, they are prompted to download the Aviance Fleet Driver app from the App Store or Google Play.</Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Ready to hit the road</Text>
                    <Text style={styles.stepDesc}>They simply log into the app with the account they just created, and instantly appear on your dashboard!</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.manualCard}>
              <View style={styles.manualHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person-add-outline" size={40} color="#043094" />
                </View>
                <Text style={styles.cardTitle}>Create Driver Account</Text>
                <Text style={styles.cardDescription}>
                  Fill in the details below to manually create an account for your driver. They will receive an email with instructions to log in.
                </Text>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>First Name *</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g. John" 
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Last Name *</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g. Doe" 
                    value={lastName}
                    onChangeText={setLastName}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, { width: '100%' }]}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="driver@example.com" 
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, { width: '100%' }]}>
                  <Text style={styles.label}>Phone Number (Optional)</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="+1 (555) 000-0000" 
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color="#043094" />
                <Text style={styles.infoText}>
                  Once created, the driver will receive a welcome email with a temporary password to access the driver app.
                </Text>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { width: '100%', justifyContent: 'center', marginTop: 10 }]} onPress={handleManualSubmit}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>Create Driver Account</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBanner: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    zIndex: 10,
  },
  headerContent: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: '#043094',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '400',
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  activeTabBtn: {
    backgroundColor: '#043094',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  contentContainer: {
    padding: 20,
  },
  mainLayout: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  manualCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  manualHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 400,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 4,
    marginRight: 24,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#043094',
    fontWeight: '600',
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#043094',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  instructionsCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  inputGroup: {
    width: Platform.OS === 'web' && width > 600 ? '48%' : '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
  }
});
