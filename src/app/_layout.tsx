import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Alert, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { supabase, setGlobalClerkToken, setClerkTokenGetter } from '../lib/supabase';
import '../i18n';
import { AssignmentsProvider } from '../context/AssignmentsContext';
import { InspectionProvider } from '../context/InspectionContext';
import { IssuesProvider } from '../context/IssuesContext';
import { AlertsProvider } from '../context/AlertsContext';
import { ServicesProvider } from '../context/ServicesContext';
import { FormsProvider } from '../context/FormsContext';
import { PartsProvider } from '../context/PartsContext';
import { VendorsProvider } from '../context/VendorsContext';
import { ReportsProvider } from '../context/ReportsContext';
import { DocumentsProvider } from '../context/DocumentsContext';
import { PreferencesProvider } from '../context/PreferencesContext';
import { VehicleProvider } from '../context/VehicleContext';
import { EquipmentProvider } from '../context/EquipmentContext';
import { PersonnelProvider } from '../context/PersonnelContext';
import { SearchProvider } from '../context/SearchContext';
import { SchedulesProvider } from '../context/SchedulesContext';
import { ToastProvider } from '../context/ToastContext';

const tokenCache = {
  async getToken(key: string) {
    try {
      if (Platform.OS === 'web') return sessionStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      if (Platform.OS === 'web') {
        sessionStorage.setItem(key, value);
        return;
      }
      return SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
}

function InitialLayout() {
  const { isLoaded: isAuthLoaded, isSignedIn, signOut } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) return;

    const isPublic = segments[0] === 'public';
    // Expo Router segments might sometimes strip groups or nest differently. Check array explicitly.
    const inAuthGroup = (segments as string[]).includes('(auth)') || (segments as string[]).includes('sign-in') || (segments as string[]).includes('sign-up');

    if (isSignedIn && user?.id) {
      const verifyAndRoute = async () => {
        let role = user?.unsafeMetadata?.role;

        // If not in Clerk metadata, verify against Supabase profiles table
        if (!role) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle();

            if (profile?.role) {
              role = profile.role;
              if (typeof (user as any).updateMetadata === 'function') {
                (user as any).updateMetadata({ unsafeMetadata: { role: profile.role } }).catch(() => {});
              } else {
                user.update({ unsafeMetadata: { ...user.unsafeMetadata, role: profile.role } }).catch(() => {});
              }
            }
          } catch (e) {
            console.error('Error checking profile role:', e);
          }
        }

        // 1. Block registered Drivers
        if (role === 'driver') {
          if (Platform.OS === 'web') {
            window.alert('Access Denied: You are registered as a Driver. Please use the Driver App.');
          } else {
            Alert.alert('Access Denied', 'You are registered as a Driver. Please use the Driver App.');
          }
          signOut();
          return;
        }

        // 2. Automatically assign Manager role if user has no role yet
        if (!role) {
          role = 'manager';
          if (typeof (user as any).updateMetadata === 'function') {
            await (user as any).updateMetadata({ unsafeMetadata: { role: 'manager' } }).catch(() => {});
          } else {
            await user.update({ unsafeMetadata: { ...user.unsafeMetadata, role: 'manager' } }).catch(() => {});
          }
        } else if (role !== 'manager' && role !== 'admin') {
          if (Platform.OS === 'web') {
            window.alert('Access Denied: Your account does not have an assigned Manager role.');
          } else {
            Alert.alert('Access Denied', 'Your account does not have an assigned Manager role.');
          }
          signOut();
          return;
        }

        // 3. Authorized Manager - ensure Supabase profile exists so foreign keys and fleet code work
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, fleet_code')
            .eq('id', user.id)
            .maybeSingle();

          let activeFleetCode = existingProfile?.fleet_code;

          if (!existingProfile) {
            const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
            let randomPart = '';
            for (let i = 0; i < 6; i++) {
              randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            activeFleetCode = 'AV-' + randomPart;

            await supabase.from('profiles').upsert({
              id: user.id,
              is_manager: true,
              role: 'manager',
              full_name: user.fullName || user.firstName || 'Manager',
              email: user.primaryEmailAddress?.emailAddress || '',
              fleet_code: activeFleetCode,
              status: 'Active',
            }, { onConflict: 'id' });
          } else if (!activeFleetCode) {
            const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
            let randomPart = '';
            for (let i = 0; i < 6; i++) {
              randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            activeFleetCode = 'AV-' + randomPart;

            await supabase.from('profiles').update({
              fleet_code: activeFleetCode,
            }).eq('id', user.id);
          }

          if (activeFleetCode && user.unsafeMetadata?.fleetCode !== activeFleetCode) {
            if (typeof (user as any).updateMetadata === 'function') {
              (user as any).updateMetadata({ unsafeMetadata: { fleetCode: activeFleetCode } }).catch(() => {});
            } else {
              user.update({
                unsafeMetadata: {
                  ...user.unsafeMetadata,
                  fleetCode: activeFleetCode,
                }
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.error('Error ensuring manager profile:', e);
        }

        // Navigate to dashboard if on auth screen
        if (inAuthGroup) {
          router.replace('/(manager)/dashboard');
        }
      };

      verifyAndRoute();
    } else if (!isSignedIn && !inAuthGroup && !isPublic) {
      router.replace('/(auth)/sign-in');
    }
  }, [isSignedIn, segments, isAuthLoaded, isUserLoaded, router, user, signOut]);

  if (!isAuthLoaded || (isSignedIn && !isUserLoaded)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#043094" />
        <Text style={{ marginTop: 16, fontSize: 15, fontWeight: '600', color: '#1F2937' }}>
          Loading Aviance FleetManager...
        </Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

function TokenSync({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isAuthLoaded) return;
    
    setClerkTokenGetter(() => getToken({ template: 'supabase' }));

    if (isSignedIn) {
      // Async token fetch
      let isActive = true;
      getToken({ template: 'supabase' })
        .then(token => {
          if (isActive) {
            setGlobalClerkToken(token);
            setIsReady(true);
          }
        })
        .catch(err => {
          if (isActive) {
            console.error(err);
            setIsReady(true);
          }
        });
      
      return () => { isActive = false; };
    } else {
      setGlobalClerkToken(null);
      // Use setTimeout to avoid synchronous state updates in the effect body
      setTimeout(() => setIsReady(true), 0);
    }
  }, [isSignedIn, isAuthLoaded, getToken]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#043094" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontError) {
      console.error(fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <TokenSync>
          <SafeAreaView style={{ flex: 1 }}>
            <ToastProvider>
              <PreferencesProvider>
              <AlertsProvider>
                <AssignmentsProvider>
                  <InspectionProvider>
                    <IssuesProvider>
                      <ServicesProvider>
                        <FormsProvider>
                          <PartsProvider>
                            <VendorsProvider>
                              <ReportsProvider>
                                <DocumentsProvider>
                                  <VehicleProvider>
                                    <EquipmentProvider>
                                      <PersonnelProvider>
                                        <SearchProvider>
                                          <SchedulesProvider>
                                            <InitialLayout />
                                          </SchedulesProvider>
                                        </SearchProvider>
                                      </PersonnelProvider>
                                    </EquipmentProvider>
                                  </VehicleProvider>
                                </DocumentsProvider>
                              </ReportsProvider>
                            </VendorsProvider>
                          </PartsProvider>
                        </FormsProvider>
                      </ServicesProvider>
                    </IssuesProvider>
                  </InspectionProvider>
                </AssignmentsProvider>
              </AlertsProvider>
            </PreferencesProvider>
            </ToastProvider>
        </SafeAreaView>
        </TokenSync>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
