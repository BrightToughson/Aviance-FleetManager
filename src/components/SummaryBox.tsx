import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SummaryItem = {
  label: string;
  count: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

interface SummaryBoxProps {
  items: SummaryItem[];
}

export default function SummaryBox({ items }: SummaryBoxProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768; // standard breakpoint for tablets/mobile

  if (isMobile) {
    return (
      <View style={[styles.summaryCard, styles.summaryCardMobile]}>
        {items.map((item, index) => {
          const bgColor = item.color.startsWith('#') ? item.color + '33' : 'rgba(255,255,255,0.2)';
          return (
            <View key={index} style={styles.summaryItemMobile}>
              <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={styles.mobileTextContainer}>
                <Text style={styles.summaryCountMobile}>{item.count}</Text>
                <Text style={styles.summaryLabelMobile}>{item.label}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.scrollWrapper} 
      contentContainerStyle={styles.summaryCard}
    >
      {items.map((item, index) => {
        const bgColor = item.color.startsWith('#') ? item.color + '33' : 'rgba(255,255,255,0.2)';
        
        return (
          <React.Fragment key={index}>
            <View style={styles.summaryItem}>
              <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={styles.summaryCount}>{item.count}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
            {index < items.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollWrapper: {
    marginBottom: 28,
  },
  summaryCard: { 
    flexDirection: 'row', 
    backgroundColor: '#043094', 
    borderRadius: 24, 
    paddingVertical: 24,
    paddingHorizontal: 16, 
    minWidth: '100%',
    shadowColor: '#043094',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  summaryCardMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 12,
    justifyContent: 'flex-start',
    marginBottom: 28,
  },
  summaryItem: { flexGrow: 1, minWidth: 70, alignItems: 'center', paddingHorizontal: 4 },
  summaryItemMobile: { 
    flexGrow: 1,
    width: '46%', 
    flexDirection: 'column', 
    alignItems: 'flex-start', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 16, 
    borderRadius: 16 
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  mobileTextContainer: {
    marginTop: 4
  },
  summaryCount: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2, textAlign: 'center' },
  summaryLabel: { fontSize: 11, color: '#E0E7FF', textAlign: 'center', fontWeight: '500' },
  summaryCountMobile: { fontSize: 18, fontWeight: '800', color: '#fff' },
  summaryLabelMobile: { fontSize: 11, color: '#E0E7FF', fontWeight: '500', marginTop: 2 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', height: 40, alignSelf: 'center', marginHorizontal: 6 },
});
