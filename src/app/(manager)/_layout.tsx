import { Drawer , DrawerContentScrollView, DrawerItemList, DrawerItem } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, useWindowDimensions, TouchableOpacity, Image, TextInput, LogBox } from 'react-native';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchProvider, useSearch } from '../../context/SearchContext';
import { useAlerts } from '../../context/AlertsContext';
import { SchedulesProvider } from '../../context/SchedulesContext';
import { VehicleProvider } from '../../context/VehicleContext';
import { EquipmentProvider } from '../../context/EquipmentContext';
import { PersonnelProvider } from '../../context/PersonnelContext';
import React, { useState } from 'react';

LogBox.ignoreLogs(['Unknown event handler property `onPressIn`', 'Unknown event handler property `onPressOut`']);

function CustomDrawerContent(props: any) {
  const router = useRouter();

  // Define the exact list of routes that should appear in the side menu
  const visibleRoutes = [
    'home', 'dashboard', 'vehicles', 'drivers', 'assignments', 'equipments',
    'inspections', 'services', 'issues', 'reminders', 'schedules', 'parts',
    'vendors', 'documents', 'contacts', 'alerts', 'reports', 'profile', 'forms'
  ];

  // Filter the routes and update indices so DrawerItemList doesn't crash
  const filteredRoutes = props.state.routes.filter((route: any) => visibleRoutes.includes(route.name));
  const filteredRouteNames = props.state.routeNames.filter((routeName: any) => visibleRoutes.includes(routeName));
  
  // Update the active index to match the filtered array
  const currentRoute = props.state.routes[props.state.index];
  let newIndex = filteredRoutes.findIndex((r: any) => r.key === currentRoute?.key);
  if (newIndex === -1) newIndex = 0; // Fallback if current route is hidden

  const filteredProps = {
    ...props,
    state: {
      ...props.state,
      routes: filteredRoutes,
      routeNames: filteredRouteNames,
      index: newIndex,
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.header}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileText}>
            M
          </Text>
        </View>
        <Text style={styles.emailText}>
          Mock User
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <DrawerItemList {...filteredProps} />
      </View>
      <View style={styles.footer}>
        <DrawerItem
          label="Sign Out"
          icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />}
          onPress={() => {
            router.replace('/(auth)/sign-in');
          }}
          labelStyle={{ color: '#ef4444' }}
        />
      </View>
    </DrawerContentScrollView>
  );
}

const CustomHeader = ({ navigation }: any) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const isMobile = width < 768;
  const isCompactSearch = width < 1024;
  const { searchQuery, setSearchQuery } = useSearch();
  const { unreadCount } = useAlerts();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  return (
    <View style={[styles.customHeaderContainer, { height: 70 }]}>
      {(!isCompactSearch || !showMobileSearch) && (
        <View style={styles.headerLeftArea}>
          {!isLargeScreen && (
            <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginRight: 15 }}>
              <Ionicons name="menu" size={28} color="#333" />
            </TouchableOpacity>
          )}
          <Image 
            source={require('../../../assets/images/logo/logo.png')} 
            style={{ width: isMobile ? 110 : 140, height: 35, resizeMode: 'contain' }} 
          />
        </View>
      )}

      {(!isCompactSearch || showMobileSearch) && (
        <View style={[styles.searchContainer, isCompactSearch && { marginHorizontal: 0, flex: 1 }]}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput 
            placeholder="Search widgets..." 
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={isCompactSearch && showMobileSearch}
          />
          {isCompactSearch && showMobileSearch && (
            <TouchableOpacity onPress={() => { setShowMobileSearch(false); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {(!isCompactSearch || !showMobileSearch) && (
        <View style={styles.headerRightArea}>
          {isCompactSearch && (
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowMobileSearch(true)}>
              <Ionicons name="search" size={24} color="#4B5563" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(manager)/alerts')}>
            <Ionicons name="notifications-outline" size={24} color="#4B5563" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {!isMobile && (
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="help-circle-outline" size={24} color="#4B5563" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/(manager)/assignments/new')}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function ManagerLayout() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const router = useRouter();

  return (
    <PersonnelProvider>
    <VehicleProvider>
    <EquipmentProvider>
    <SchedulesProvider>
    <SearchProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer
          backBehavior="history"
          drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
          drawerType: isLargeScreen ? 'permanent' : 'front',
          drawerStyle: isLargeScreen ? { width: 280 } : undefined,
          drawerActiveBackgroundColor: '#043094',
          drawerActiveTintColor: '#fff',
          drawerInactiveTintColor: '#333',
          header: (props) => <CustomHeader {...props} />
        })}
      >
        <Drawer.Screen
          name="home"
          options={{
            drawerLabel: 'Home',
            title: 'Home',
            drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="dashboard"
          options={{
            drawerLabel: 'Dashboard',
            title: 'Dashboard',
            drawerIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="vehicles"
          options={{
            drawerLabel: 'Vehicles',
            title: 'Vehicles',
            drawerIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} />,
          }}
          listeners={{
            drawerItemPress: (e) => {
              e.preventDefault();
              router.replace('/(manager)/vehicles' as any);
            }
          }}
        />
        <Drawer.Screen
          name="drivers"
          options={{
            drawerLabel: 'Drivers',
            title: 'Drivers',
            drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="assignments"
          options={{
            drawerLabel: 'Assignments',
            title: 'Assignments',
            drawerIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
          }}
          listeners={{
            drawerItemPress: (e) => {
              e.preventDefault();
              router.replace('/(manager)/assignments' as any);
            }
          }}
        />
        <Drawer.Screen
          name="equipments"
          options={{
            drawerLabel: 'Equipments',
            title: 'Equipments',
            drawerIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="inspections"
          options={{
            drawerLabel: 'Inspections',
            title: 'Inspections',
            drawerIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="services"
          options={{
            drawerLabel: 'Services',
            title: 'Services',
            drawerIcon: ({ color, size }) => <Ionicons name="build-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="issues"
          options={{
            drawerLabel: 'Issues',
            title: 'Issues',
            drawerIcon: ({ color, size }) => <Ionicons name="warning-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="reminders"
          options={{
            drawerLabel: 'Reminders',
            title: 'Reminders',
            drawerIcon: ({ color, size }) => <Ionicons name="alarm-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="schedules"
          options={{
            drawerLabel: 'Schedules',
            title: 'Schedules',
            drawerIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="parts"
          options={{
            drawerLabel: 'Parts & Inventory',
            title: 'Parts & Inventory',
            drawerIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="vendors"
          options={{
            drawerLabel: 'Vendors',
            title: 'Vendors',
            drawerIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="documents"
          options={{
            drawerLabel: 'Documents',
            title: 'Documents',
            drawerIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="contacts"
          options={{
            drawerLabel: 'Contacts',
            title: 'Contacts',
            drawerIcon: ({ color, size }) => <Ionicons name="call-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="alerts"
          options={{
            drawerLabel: 'Alerts',
            title: 'Alerts',
            drawerIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="reports"
          options={{
            drawerLabel: 'Reports',
            title: 'Reports',
            drawerIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: 'Profile',
            title: 'Profile',
            drawerIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="forms"
          options={{
            drawerLabel: 'Custom Forms',
            title: 'Custom Forms',
            drawerIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
          }}
        />
      </Drawer>
      </GestureHandlerRootView>
      </SearchProvider>
    </SchedulesProvider>
    </EquipmentProvider>
    </VehicleProvider>
    </PersonnelProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
    alignItems: 'center',
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  footer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  customHeaderContainer: {
    height: 70,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeftArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
    marginHorizontal: 20,
    maxWidth: 600,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#111827',
    outlineStyle: 'none',
  } as any,
  headerRightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconButton: {
    marginLeft: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  addButton: {
    marginLeft: 20,
    backgroundColor: '#043094',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
