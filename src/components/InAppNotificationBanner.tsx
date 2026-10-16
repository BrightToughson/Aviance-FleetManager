import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertMessage } from '../context/AlertsContext';

interface InAppNotificationBannerProps {
  alert: AlertMessage | null;
  onDismiss: () => void;
  onPressAction?: (alert: AlertMessage) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  alert,
  onDismiss,
  onPressAction,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const translateY = useRef(new Animated.Value(-160)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (alert) {
      // Reset values
      translateY.setValue(-160);
      opacityAnim.setValue(0);
      progressAnim.setValue(1);

      // Spring in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Start 5-second progress bar
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 5000,
        useNativeDriver: false, // width interpolation
      }).start();

      timerRef.current = setTimeout(() => {
        dismissBanner();
      }, 5000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else {
      translateY.setValue(-160);
      opacityAnim.setValue(0);
    }
  }, [alert]);

  const dismissBanner = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleBannerPress = () => {
    if (!alert) return;
    dismissBanner();

    if (onPressAction) {
      onPressAction(alert);
      return;
    }

    // Default route mapping based on alert type
    switch (alert.type) {
      case 'reminder':
        router.push('/(manager)/reminders');
        break;
      case 'schedule':
        router.push('/(manager)/schedules');
        break;
      case 'assignment':
        router.push('/(manager)/assignments');
        break;
      case 'request':
        router.push('/(manager)/requests');
        break;
      case 'checklist':
        router.push('/(manager)/inspections');
        break;
      default:
        router.push('/(manager)/alerts');
        break;
    }
  };

  if (!alert) return null;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'reminder':
        return {
          icon: 'alarm' as const,
          color: '#F59E0B',
          bg: '#FEF3C7',
          tag: 'REMINDER',
        };
      case 'schedule':
        return {
          icon: 'calendar' as const,
          color: '#3B82F6',
          bg: '#DBEAFE',
          tag: 'SCHEDULE',
        };
      case 'assignment':
        return {
          icon: 'briefcase' as const,
          color: '#10B981',
          bg: '#D1FAE5',
          tag: 'ASSIGNMENT',
        };
      case 'request':
        return {
          icon: 'document-text' as const,
          color: '#8B5CF6',
          bg: '#EDE9FE',
          tag: 'REQUEST',
        };
      case 'checklist':
        return {
          icon: 'checkmark-circle' as const,
          color: '#EF4444',
          bg: '#FEE2E2',
          tag: 'INSPECTION',
        };
      default:
        return {
          icon: 'notifications' as const,
          color: '#043094',
          bg: '#EFF6FF',
          tag: 'ALERT',
        };
    }
  };

  const config = getTypeConfig(alert.type);

  const topOffset = Math.max(insets.top + 10, isDesktop ? 20 : 12);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.overlayContainer,
        {
          top: topOffset,
          right: isDesktop ? 24 : 12,
          left: isDesktop ? undefined : 12,
          width: isDesktop ? 400 : undefined,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.bannerCard,
          {
            transform: [{ translateY }],
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleBannerPress}
          style={styles.contentRow}
        >
          {/* Icon Badge */}
          <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={22} color={config.color} />
          </View>

          {/* Texts */}
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <View style={[styles.tagPill, { backgroundColor: config.bg }]}>
                <Text style={[styles.tagText, { color: config.color }]}>
                  {config.tag}
                </Text>
              </View>
              <Text style={styles.timeText}>Just now</Text>
            </View>
            <Text style={styles.titleText} numberOfLines={1}>
              {alert.title}
            </Text>
            <Text style={styles.bodyText} numberOfLines={2}>
              {alert.body}
            </Text>
          </View>

          {/* Action & Close */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={dismissBanner}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBannerPress}
              style={[styles.viewBtn, { backgroundColor: config.color }]}
            >
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Auto-dismiss progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: config.color,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    zIndex: 999999,
    elevation: 999999,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginRight: 4,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  bodyText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
    marginTop: 2,
  },
  actionsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
  },
  closeBtn: {
    padding: 2,
  },
  viewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 'auto',
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
});
