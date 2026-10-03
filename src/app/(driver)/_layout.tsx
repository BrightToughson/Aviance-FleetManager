import { Drawer , DrawerContentScrollView, DrawerItemList, DrawerItem } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, useWindowDimensions, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';

function CustomDrawerContent(props: any) {
  const router = useRouter();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.header}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileText}>D</Text>
        </View>
        <Text style={styles.emailText}>Driver User</Text>
      </View>
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={[styles.customHeaderContainer, { height: 70 }]}>
      <View style={styles.headerLeftArea}>
        {!isMobile && (
          <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginRight: 15 }}>
            <Ionicons name="menu" size={28} color="#333" />
          </TouchableOpacity>
        )}
        {isMobile && (
          <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginRight: 15 }}>
            <Ionicons name="menu" size={28} color="#333" />
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#043094' }}>Driver App</Text>
      </View>
      <View style={styles.headerRightArea}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={24} color="#4B5563" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function DriverLayout() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
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
          name="index"
          options={{
            drawerLabel: 'Dashboard',
            title: 'Dashboard',
            drawerIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="inspections"
          options={{
            drawerLabel: 'My Inspections',
            title: 'My Inspections',
            drawerIcon: ({ color, size }) => <Ionicons name="clipboard-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="issues"
          options={{
            drawerLabel: 'Report Issue',
            title: 'Report Issue',
            drawerIcon: ({ color, size }) => <Ionicons name="warning-outline" size={size} color={color} />,
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
      </Drawer>
    </GestureHandlerRootView>
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
});
