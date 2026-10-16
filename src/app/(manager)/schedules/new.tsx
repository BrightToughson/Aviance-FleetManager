import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, TextInput, ScrollView, Platform, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Notifications from 'expo-notifications';
import { useAlerts } from '../../../context/AlertsContext';
import { useSchedules } from '../../../context/SchedulesContext';

export default function NewScheduleScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 1024;
  
  const { addAlert } = useAlerts();
  const { addSchedule } = useSchedules();

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 60000));
  const [hasDate, setHasDate] = useState(true);
  const [hasTime, setHasTime] = useState(true);
  const [isReminderToggle, setIsReminderToggle] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleConfirmDate = (selectedDate: Date) => {
    setShowDatePicker(false);
    const currentDate = date;
    selectedDate.setHours(currentDate.getHours());
    selectedDate.setMinutes(currentDate.getMinutes());
    setDate(selectedDate);
    setHasDate(true);
  };

  const handleConfirmTime = (selectedDate: Date) => {
    setShowTimePicker(false);
    const newDate = new Date(date);
    newDate.setHours(selectedDate.getHours());
    newDate.setMinutes(selectedDate.getMinutes());
    setDate(newDate);
    setHasTime(true);
  };

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalTimeString = (d: Date) => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleAddSchedule = async () => {
    if (!newTitle.trim()) {
      if (Platform.OS === 'web') window.alert('Please enter a Schedule title.');
      else Alert.alert('Error', 'Please enter a Schedule title.');
      return;
    }

    if (!hasDate && !hasTime) {
      if (Platform.OS === 'web') window.alert('Please select at least a date or time to set an alert.');
      else Alert.alert('Error', 'Please select at least a date or time to set an alert.');
      return;
    }

    let finalDate = new Date(date);
    let isScheduled = isReminderToggle;
    
    if (hasDate && !hasTime) {
      finalDate.setHours(23, 59, 0, 0);
    } else if (!hasDate && hasTime) {
      const now = new Date();
      finalDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      if (finalDate.getTime() < Date.now()) {
        finalDate.setDate(finalDate.getDate() + 1);
      }
    }

    const timeDiff = (finalDate.getTime() - Date.now()) / 1000;
    if (timeDiff <= 0) {
      if (Platform.OS === 'web') window.alert('Please select a future date and time for the alert.');
      else Alert.alert('Error', 'Please select a future date and time for the alert.');
      return;
    }

    let dueDateStr = 'Anytime';
    if (hasDate && hasTime) dueDateStr = finalDate.toLocaleDateString() + ' ' + finalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    else if (hasDate) dueDateStr = finalDate.toLocaleDateString();
    else if (hasTime) dueDateStr = 'By ' + finalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newRem = {
      id: Math.random().toString(),
      title: newTitle,
      description: newDescription,
      dueDate: dueDateStr,
      daysLeft: isScheduled ? Math.max(1, Math.ceil(timeDiff / (60 * 60 * 24))) : 0,
      type: 'Personal',
      icon: 'alarm',
      status: 'active',
      timestamp: finalDate.getTime(),
      hasDate,
      hasTime,
      isReminder: isReminderToggle
    };

    addSchedule(newRem);
    addAlert(`New Schedule: ${newTitle}`, `You have set a schedule for ${dueDateStr}`, 'schedule');

    if (isScheduled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') window.alert('Permission needed. Please allow notifications to receive alerts.');
        else Alert.alert('Permission needed', 'Please allow notifications to receive alerts.');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Manager Schedule: ${newRem.title}`,
          body: newDescription ? newDescription : `Due: ${newRem.dueDate}`,
          sound: true,
          categoryIdentifier: 'Schedule_ALARM',
          priority: Notifications.AndroidNotificationPriority.MAX,
          interruptionLevel: 'timeSensitive',
          data: { ScheduleId: newRem.id, title: newRem.title },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.floor(timeDiff),
        },
      });

      if (Platform.OS === 'web') window.alert('Schedule Set!');
      else Alert.alert('Schedule Set!', `An alert has been scheduled for ${newRem.dueDate}.`);
    } else {
      if (Platform.OS === 'web') window.alert('Schedule Saved');
      else Alert.alert('Schedule Saved', 'Saved without an alert schedule.');
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/schedules');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(manager)/schedules')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#043094" />
            <Text style={styles.backBtnText}>Back to Schedules</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>{t('m_schedules_add_btn', 'Add Schedule')}</Text>
          <Text style={styles.pageSubtitle}>Set up a new maintenance or event schedule</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainLayout, !isMobile && styles.desktopLayout]}>
          <View style={styles.card}>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Schedule Title <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Yearly Inspection"
                value={newTitle}
                onChangeText={setNewTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput 
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} 
                placeholder="Additional details..."
                multiline
                numberOfLines={3}
                value={newDescription}
                onChangeText={setNewDescription}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Schedule Date & Time</Text>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeBtnWrapper}>
                  {Platform.OS === 'web' ? (
                    <View style={[styles.webInputWrapper, !hasDate && styles.webInputWrapperEmpty]}>
                      <Ionicons name={hasDate ? "calendar" : "calendar-outline"} size={18} color={hasDate ? "#043094" : "#6B7280"} style={{ marginRight: 8 }} />
                      <input 
                        type="date"
                        value={hasDate ? getLocalDateString(date) : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            const nextDate = new Date(date);
                            nextDate.setFullYear(year, month - 1, day);
                            setDate(nextDate);
                            setHasDate(true);
                          } else {
                            setHasDate(false);
                          }
                        }}
                        onClick={(e) => (e.target as any).showPicker && (e.target as any).showPicker()}
                        style={{
                          flex: 1,
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: hasDate ? '#043094' : '#6B7280',
                          fontWeight: '600',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      />
                      {hasDate && (
                        <TouchableOpacity style={styles.clearDateTimeBtn} onPress={() => setHasDate(false)}>
                          <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : hasDate ? (
                    <TouchableOpacity style={styles.dateTimeBtn} onPress={() => setShowDatePicker(true)}>
                      <Ionicons name="calendar" size={18} color="#043094" />
                      <Text style={styles.dateTimeText}>{date.toLocaleDateString()}</Text>
                      <TouchableOpacity style={styles.clearDateTimeBtn} onPress={() => setHasDate(false)}>
                        <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.dateTimeBtnEmpty} onPress={() => setShowDatePicker(true)}>
                      <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                      <Text style={styles.dateTimeTextEmpty}>Set Date</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.dateTimeBtnWrapper}>
                  {Platform.OS === 'web' ? (
                    <View style={[styles.webInputWrapper, !hasTime && styles.webInputWrapperEmpty]}>
                      <Ionicons name={hasTime ? "time" : "time-outline"} size={18} color={hasTime ? "#043094" : "#6B7280"} style={{ marginRight: 8 }} />
                      <input 
                        type="time"
                        value={hasTime ? getLocalTimeString(date) : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const nextDate = new Date(date);
                            nextDate.setHours(hours, minutes, 0, 0);
                            setDate(nextDate);
                            setHasTime(true);
                          } else {
                            setHasTime(false);
                          }
                        }}
                        onClick={(e) => (e.target as any).showPicker && (e.target as any).showPicker()}
                        style={{
                          flex: 1,
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: hasTime ? '#043094' : '#6B7280',
                          fontWeight: '600',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      />
                      {hasTime && (
                        <TouchableOpacity style={styles.clearDateTimeBtn} onPress={() => setHasTime(false)}>
                          <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : hasTime ? (
                    <TouchableOpacity style={styles.dateTimeBtn} onPress={() => setShowTimePicker(true)}>
                      <Ionicons name="time" size={18} color="#043094" />
                      <Text style={styles.dateTimeText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      <TouchableOpacity style={styles.clearDateTimeBtn} onPress={() => setHasTime(false)}>
                        <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.dateTimeBtnEmpty} onPress={() => setShowTimePicker(true)}>
                      <Ionicons name="time-outline" size={18} color="#6B7280" />
                      <Text style={styles.dateTimeTextEmpty}>Set Time</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
            
            <View style={[styles.inputGroup, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={styles.label}>Enable Device Notification</Text>
              <Switch 
                value={isReminderToggle} 
                onValueChange={setIsReminderToggle}
                trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
                thumbColor={isReminderToggle ? '#043094' : '#f4f3f4'}
              />
            </View>

            {Platform.OS !== 'web' && (
              <>
                <DateTimePickerModal
                  isVisible={showDatePicker}
                  mode="date"
                  onConfirm={handleConfirmDate}
                  onCancel={() => setShowDatePicker(false)}
                  date={date}
                  minimumDate={new Date()}
                />
                
                <DateTimePickerModal
                  isVisible={showTimePicker}
                  mode="time"
                  onConfirm={handleConfirmTime}
                  onCancel={() => setShowTimePicker(false)}
                  date={date}
                />
              </>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddSchedule}>
              <Text style={styles.submitBtnText}>Create Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerBanner: { backgroundColor: '#fff', paddingVertical: 30, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerContent: { maxWidth: 1000, width: '100%', alignSelf: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  backBtnText: { color: '#043094', fontSize: 14, marginLeft: 6, fontWeight: '600' },
  pageTitle: { fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  pageSubtitle: { fontSize: 16, color: '#6B7280' },
  contentContainer: { padding: 20, alignItems: 'center' },
  mainLayout: { width: '100%', maxWidth: 600, marginTop: 20 },
  desktopLayout: { maxWidth: 600 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827' },
  submitBtn: { backgroundColor: '#043094', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateTimeBtnWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dateTimeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 12, gap: 4 },
  dateTimeText: { color: '#043094', fontWeight: '600', fontSize: 14 },
  clearDateTimeBtn: { padding: 4, marginLeft: 4 },
  dateTimeBtnEmpty: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 12, padding: 12, gap: 4 },
  dateTimeTextEmpty: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  webInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 46,
  },
  webInputWrapperEmpty: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
});
