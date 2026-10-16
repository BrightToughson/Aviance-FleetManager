import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PreferencesContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  notifications: boolean;
  setNotifications: (value: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false);
  const [notifications, setNotificationsState] = useState(true);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const storedDarkMode = await AsyncStorage.getItem('@pref_dark_mode');
        const storedNotifications = await AsyncStorage.getItem('@pref_notifications');
        
        if (storedDarkMode !== null) setDarkModeState(storedDarkMode === 'true');
        if (storedNotifications !== null) setNotificationsState(storedNotifications === 'true');
      } catch (e) {
        console.error('Failed to load preferences', e);
      }
    }
    loadPreferences();
  }, []);

  const setDarkMode = async (value: boolean) => {
    setDarkModeState(value);
    await AsyncStorage.setItem('@pref_dark_mode', String(value));
  };

  const setNotifications = async (value: boolean) => {
    setNotificationsState(value);
    await AsyncStorage.setItem('@pref_notifications', String(value));
  };

  return (
    <PreferencesContext.Provider value={{ darkMode, setDarkMode, notifications, setNotifications }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
