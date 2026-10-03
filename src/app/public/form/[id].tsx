import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useForms, FormFieldDef } from '../../../context/FormsContext';
import { Ionicons } from '@expo/vector-icons';

export default function PublicFormScreen() {
  const { id } = useLocalSearchParams();
  const { forms, submitForm } = useForms();
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const form = forms.find((f: any) => f.id === id);

  if (!form) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
        <Text style={styles.errorText}>Form not found or has been removed.</Text>
      </View>
    );
  }

  if (!form.active) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#9CA3AF" />
        <Text style={styles.errorText}>This form is currently closed and not accepting submissions.</Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color="#059669" />
        </View>
        <Text style={styles.successTitle}>Thank You!</Text>
        <Text style={styles.successDesc}>Your response has been submitted successfully.</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={() => { setSubmitted(false); setFormData({}); }}>
          <Text style={styles.resetBtnText}>Submit Another Response</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    form.fields.forEach((field: FormFieldDef) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    submitForm(form.id, formData);
    setSubmitted(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../../../assets/images/logo/company-logo.png')} 
          style={styles.logo} 
        />
      </View>
      <View style={styles.formCard}>
        <View style={styles.header}>
          <Text style={styles.title}>{form.title}</Text>
          <Text style={styles.description}>{form.description}</Text>
        </View>
        
        <View style={styles.body}>
          {form.fields.map((field: FormFieldDef) => (
            <View key={field.name} style={styles.fieldGroup}>
              <Text style={styles.label}>
                {field.label} {field.required && <Text style={styles.required}>*</Text>}
              </Text>
              
              {field.type === 'text' && (
                <TextInput
                  style={[styles.input, errors[field.name] ? styles.inputError : null]}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  value={formData[field.name] || ''}
                  onChangeText={(text) => handleChange(field.name, text)}
                  placeholderTextColor="#9CA3AF"
                  // @ts-ignore
                  outlineStyle="none"
                />
              )}

              {field.type === 'number' && (
                <TextInput
                  style={[styles.input, errors[field.name] ? styles.inputError : null]}
                  placeholder={`Enter number`}
                  value={formData[field.name] || ''}
                  onChangeText={(text) => handleChange(field.name, text)}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                  // @ts-ignore
                  outlineStyle="none"
                />
              )}

              {field.type === 'select' && (
                <View style={styles.selectContainer}>
                  {(field.options || []).map((opt, idx) => {
                    const isSelected = formData[field.name] === opt;
                    return (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.optionRow} 
                        onPress={() => handleChange(field.name, opt)}
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.optionText}>{opt}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
              
              {errors[field.name] ? (
                <Text style={styles.errorMsg}>{errors[field.name]}</Text>
              ) : null}
            </View>
          ))}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit Form</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 24, maxWidth: 600, marginHorizontal: 'auto', width: '100%', paddingVertical: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 140, height: 40, resizeMode: 'contain' },
  
  formCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  header: { backgroundColor: '#043094', padding: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  description: { fontSize: 16, color: '#E0E7FF', lineHeight: 24 },
  
  body: { padding: 32 },
  fieldGroup: { marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#EF4444' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 16, height: 48, fontSize: 16, color: '#111827', backgroundColor: '#F9FAFB' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorMsg: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  
  selectContainer: { gap: 12, marginTop: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioCircleSelected: { borderColor: '#043094' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#043094' },
  optionText: { fontSize: 16, color: '#374151' },
  
  submitBtn: { backgroundColor: '#043094', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  errorText: { fontSize: 18, color: '#4B5563', marginTop: 16, textAlign: 'center' },
  
  successCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  successDesc: { fontSize: 16, color: '#4B5563', marginBottom: 32 },
  resetBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  resetBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' }
});
