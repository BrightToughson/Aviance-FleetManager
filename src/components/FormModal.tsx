import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'image';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: string;
  dependsOn?: {
    field: string;
    value: string;
  };
}

interface FormModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  onSubmit: (data: any) => void;
  submitText?: string;
}

export default function FormModal({ visible, onClose, title, fields, onSubmit, submitText = 'Save' }: FormModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [imageModalField, setImageModalField] = useState<string | null>(null);

  const handlePickImage = async (useCamera: boolean, fieldName: string) => {
    setImageModalField(null);
    try {
      let result;
      if (useCamera) {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
          if (Platform.OS === 'web') window.alert("Permission to access camera was denied");
          else Alert.alert("Permission Denied", "Permission to access camera was denied");
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: true, aspect: [1, 1] });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ quality: 1, allowsEditing: true, aspect: [1, 1] });
      }
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleChange(fieldName, result.assets[0].uri);
      }
    } catch (err) {
      console.log(err);
    }
  };

  React.useEffect(() => {
    if (visible) {
      const initialData: Record<string, string> = {};
      fields.forEach(f => {
        if (f.defaultValue) {
          initialData[f.name] = f.defaultValue;
        }
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(initialData);
    } else {
      setFormData({});
    }
  }, [visible, fields]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
    setFormData({});
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
            {fields.map((field) => {
              if (field.dependsOn) {
                if (formData[field.dependsOn.field] !== field.dependsOn.value) {
                  return null;
                }
              }
              return (
              <View key={field.name} style={styles.fieldGroup}>
                <Text style={styles.label}>
                  {field.label} {field.required && <Text style={styles.required}>*</Text>}
                </Text>
                
                {field.type === 'select' && field.options ? (
                  <View style={styles.customSelectContainer}>
                    <TouchableOpacity 
                      style={[styles.customSelectButton, openDropdown === field.name && styles.customSelectButtonActive]}
                      activeOpacity={0.7}
                      onPress={() => setOpenDropdown(field.name)}
                    >
                      <Text style={[styles.customSelectText, !formData[field.name] && styles.customSelectPlaceholder]}>
                        {formData[field.name] || `Select ${field.label}`}
                      </Text>
                      <Ionicons name={openDropdown === field.name ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ) : field.type === 'image' ? (
                  <View style={{ alignItems: 'center', marginVertical: 10 }}>
                    <TouchableOpacity 
                      style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', position: 'relative' }}
                      onPress={() => setImageModalField(field.name)}
                    >
                      {formData[field.name] ? (
                        <>
                          <Image source={{ uri: formData[field.name] }} style={{ width: '100%', height: '100%' }} />
                          <View style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>EDIT</Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
                          <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>Add Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    value={formData[field.name] || ''}
                    onChangeText={(text) => handleChange(field.name, text)}
                    keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                    placeholderTextColor="#9CA3AF"
                    // @ts-ignore
                    outlineStyle="none"
                  />
                )}
              </View>
            )
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>{submitText}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {openDropdown && (
          <View style={styles.popupOverlay}>
            <TouchableOpacity 
              style={styles.popupBackdrop} 
              activeOpacity={1} 
              onPress={() => setOpenDropdown(null)} 
            />
            <View style={styles.popupContainer}>
              <View style={styles.popupHeader}>
                <Text style={styles.popupTitle}>Select {fields.find(f => f.name === openDropdown)?.label}</Text>
                <TouchableOpacity style={styles.popupCloseBtn} onPress={() => setOpenDropdown(null)}>
                  <Ionicons name="close" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.popupScroll} contentContainerStyle={{ paddingVertical: 8 }}>
                {fields.find(f => f.name === openDropdown)?.options?.map(opt => {
                  const isSelected = formData[openDropdown] === opt;
                  return (
                    <TouchableOpacity 
                      key={opt}
                      style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                      onPress={() => {
                        handleChange(openDropdown, opt);
                        setOpenDropdown(null);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                        {opt}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {imageModalField && (
          <View style={styles.popupOverlay}>
            <TouchableOpacity 
              style={styles.popupBackdrop} 
              activeOpacity={1} 
              onPress={() => setImageModalField(null)} 
            />
            <View style={[styles.popupContainer, { maxWidth: 320 }]}>
              <View style={styles.popupHeader}>
                <Text style={styles.popupTitle}>Upload Photo</Text>
                <TouchableOpacity style={styles.popupCloseBtn} onPress={() => setImageModalField(null)}>
                  <Ionicons name="close" size={20} color="#4B5563" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.popupScroll} contentContainerStyle={{ paddingVertical: 8 }}>
                <TouchableOpacity style={[styles.dropdownItem, { justifyContent: 'flex-start' }]} onPress={() => handlePickImage(true, imageModalField)}>
                  <Ionicons name="camera-outline" size={24} color="#0EA5E9" />
                  <Text style={[styles.dropdownItemText, { marginLeft: 12 }]}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.dropdownItem, { justifyContent: 'flex-start' }]} onPress={() => handlePickImage(false, imageModalField)}>
                  <Ionicons name="image-outline" size={24} color="#10B981" />
                  <Text style={[styles.dropdownItemText, { marginLeft: 12 }]}>Choose from Gallery</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  customSelectContainer: {
    position: 'relative',
  },
  customSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: '#fff',
  },
  customSelectButtonActive: {
    borderColor: '#043094',
    backgroundColor: '#F8FAFC',
  },
  customSelectText: {
    fontSize: 15,
    color: '#111827',
  },
  customSelectPlaceholder: {
    color: '#9CA3AF',
  },
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: 20,
  },
  popupBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.65)',
  },
  popupContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    maxHeight: '85%',
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  popupCloseBtn: {
    backgroundColor: '#F3F4F6',
    padding: 6,
    borderRadius: 20,
  },
  popupScroll: {
    flexGrow: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
  },
  dropdownItemTextActive: {
    color: '#043094',
    fontWeight: '700',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#043094',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#043094',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
