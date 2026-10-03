import React from 'react';
import { View, Text, Platform } from 'react-native';

export function WebChartFallback({ children, width, height }: any) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ width, height, backgroundColor: '#F9FAFB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginVertical: 10 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Chart (Native App Only)</Text>
        <Text style={{ color: '#D1D5DB', fontSize: 11, marginTop: 4 }}>Not supported in Web Preview</Text>
      </View>
    );
  }
  
  return <>{children}</>;
}
