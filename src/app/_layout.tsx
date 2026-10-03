import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
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

function InitialLayout() {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const isPublic = segments[0] === 'public';
    const inTabsGroup = segments[0] === '(manager)';

    setTimeout(() => {
      // Auth is bypassed for development. Always go to the dashboard!
      if (!inTabsGroup && !isPublic) {
        console.log('[Router] Bypassing Auth -> Redirecting to dashboard');
        router.replace('/(manager)/dashboard');
      }
    }, 100);
  }, [segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
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
                          <InitialLayout />
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
    </SafeAreaView>
  );
}
