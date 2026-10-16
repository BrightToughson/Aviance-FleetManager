import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const insets = useSafeAreaInsets();
  
  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    
    // Slide in
    Animated.spring(slideAnim, {
      toValue: insets.top > 0 ? insets.top + 10 : 40,
      useNativeDriver: true,
      friction: 8,
      tension: 40
    }).start();

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      hideToast();
    }, 3000);
  };

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setToast(null));
  };

  const getBackgroundColor = (type: ToastType) => {
    switch(type) {
      case 'success': return '#10B981'; // Emerald 500
      case 'error': return '#EF4444'; // Red 500
      case 'info': return '#3B82F6'; // Blue 500
      default: return '#10B981';
    }
  };

  const getIconName = (type: ToastType) => {
    switch(type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={hideToast} style={[styles.toast, { backgroundColor: getBackgroundColor(toast.type) }]}>
            <Ionicons name={getIconName(toast.type) as any} size={24} color="#FFF" style={styles.icon} />
            <Text style={styles.message}>{toast.message}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
    paddingHorizontal: 20,
    pointerEvents: 'box-none'
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 400,
    width: '100%',
    ...Platform.select({
      web: { cursor: 'pointer' } as any
    })
  },
  icon: {
    marginRight: 12
  },
  message: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  }
});
