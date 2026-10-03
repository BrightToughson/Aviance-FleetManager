import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Platform, KeyboardAvoidingView, Image, Share, Modal } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useForms, FormFieldDef } from '../../../context/FormsContext';

const fieldTypes = [
  { id: 'text', label: 'Short Answer', icon: 'text-outline' },
  { id: 'number', label: 'Number', icon: 'calculator-outline' },
  { id: 'select', label: 'Multiple Choice', icon: 'list-circle-outline' }
] as const;

export default function CreateFormScreen() {
  const router = useRouter();
  const { createForm } = useForms();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [fields, setFields] = useState<FormFieldDef[]>([
    { name: 'field_0', label: '', type: 'text', required: false }
  ]);
  
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [publishedFormId, setPublishedFormId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<any>(null);

  const handleAddField = () => {
    const newFieldId = `field_${Date.now()}`;
    const newFields = [...fields, { name: newFieldId, label: '', type: 'text' as const, required: false }];
    setFields(newFields);
    setActiveFieldIndex(newFields.length - 1);
  };

  const updateField = (index: number, updates: Partial<FormFieldDef>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = [...fields];
    updatedFields.splice(index, 1);
    setFields(updatedFields);
    if (activeFieldIndex === index) {
      setActiveFieldIndex(null);
    } else if (activeFieldIndex !== null && activeFieldIndex > index) {
      setActiveFieldIndex(activeFieldIndex - 1);
    }
  };

  const addOption = (index: number) => {
    const field = fields[index];
    const opts = field.options ? [...field.options] : [];
    opts.push(`Option ${opts.length + 1}`);
    updateField(index, { options: opts });
  };

  const updateOption = (fieldIndex: number, optionIndex: number, newValue: string) => {
    const field = fields[fieldIndex];
    if (!field.options) return;
    const opts = [...field.options];
    opts[optionIndex] = newValue;
    updateField(fieldIndex, { options: opts });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    if (!field.options) return;
    const opts = [...field.options];
    opts.splice(optionIndex, 1);
    updateField(fieldIndex, { options: opts });
  };

  const handleSave = () => {
    const cleanedFields = fields.map(f => ({
      ...f,
      label: f.label.trim() === '' ? 'Untitled Question' : f.label,
      name: (f.label.trim() === '' ? 'Untitled_Question' : f.label.replace(/[^a-zA-Z0-9]/g, '_')).toLowerCase() + '_' + Math.floor(Math.random()*1000)
    }));

    const newId = createForm({
      title: title.trim() === '' ? 'Untitled Form' : title,
      description,
      fields: cleanedFields,
      active: true,
    });
    setPublishedFormId(newId);
  };

  const shareLink = async () => {
    if (!publishedFormId) return;
    const url = `https://aviance-fleet.web.app/public/form/${publishedFormId}`;
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        await Share.share({
          message: `Please fill out this form: ${url}`,
          url: url
        });
      }
    } catch (error) {
      console.log('Error sharing', error);
    }
  };

  if (publishedFormId) {
    const publicUrl = `https://aviance-fleet.web.app/public/form/${publishedFormId}`;
    
    const printQRCode = () => {
      qrRef.current?.toDataURL(async (data: string) => {
        try {
          const html = `
            <html>
              <body style="display: flex; justify-content: center; align-items: center; height: 100vh;">
                <div style="text-align: center;">
                  <h1 style="font-family: sans-serif;">Scan to Fill Form</h1>
                  <img src="data:image/png;base64,${data}" style="width: 300px; height: 300px;" />
                  <p style="font-family: sans-serif; color: #666; margin-top: 20px; font-size: 14px;">${publicUrl}</p>
                </div>
              </body>
            </html>
          `;
          await Print.printAsync({ html });
        } catch (error: any) {
          if (error?.message?.includes('PrintIncompleteException')) {
            // User cancelled the print dialog
            return;
          }
          console.error('Print error:', error);
        }
      });
    };

    const shareQRCodeImage = () => {
      qrRef.current?.toDataURL(async (data: string) => {
        try {
          const uri = FileSystem.cacheDirectory + 'qrcode.png';
          await FileSystem.writeAsStringAsync(uri, data, { encoding: FileSystem.EncodingType.Base64 });
          await Sharing.shareAsync(uri, { dialogTitle: 'Share QR Code' });
        } catch (error) {
          console.error('Share error:', error);
        }
      });
    };

    return (
      <View style={styles.successScreen}>
        
        {/* QR Code Modal */}
        <Modal visible={showQR} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Scan to Fill Form</Text>
              <View style={styles.qrWrapper}>
                <QRCode value={publicUrl} size={200} getRef={(c) => (qrRef.current = c)} />
              </View>
              <Text style={styles.qrUrl} numberOfLines={1} ellipsizeMode="middle">{publicUrl}</Text>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, width: '100%' }}>
                <TouchableOpacity style={[styles.printBtn, { flex: 1 }]} onPress={Platform.OS === 'web' ? () => window.print() : printQRCode}>
                  <Ionicons name="print-outline" size={18} color="#043094" style={{marginRight: 8}} />
                  <Text style={styles.printBtnText}>Print</Text>
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                  <TouchableOpacity style={[styles.printBtn, { flex: 1, backgroundColor: '#E0E7FF' }]} onPress={shareQRCodeImage}>
                    <Ionicons name="share-outline" size={18} color="#043094" style={{marginRight: 8}} />
                    <Text style={styles.printBtnText}>Share</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <TouchableOpacity style={styles.closeQrBtn} onPress={() => setShowQR(false)}>
                <Text style={styles.closeQrBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.successCard}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-done-circle" size={80} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Form Published Successfully!</Text>
          <Text style={styles.successDesc}>Your form is now live and ready to accept responses.</Text>

          <View style={styles.successActions}>
            <TouchableOpacity style={[styles.shareBtn, copied && styles.shareBtnCopied]} onPress={shareLink}>
              <Ionicons name={copied ? "checkmark-outline" : "link-outline"} size={32} color={copied ? "#059669" : "#043094"} />
              <Text style={[styles.shareBtnText, copied && {color: "#059669"}]}>
                {copied ? 'Copied to Clipboard!' : 'Share with Link'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={() => setShowQR(true)}>
              <Ionicons name="qr-code-outline" size={32} color="#043094" />
              <Text style={styles.shareBtnText}>Print QR Code</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.returnBtn} onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(manager)/forms');
            }
          }}>
            <Text style={styles.returnBtnText}>Move to Custom Forms</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Modern Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(manager)/forms');
            }
          }}>
            <Ionicons name="arrow-back" size={20} color="#4B5563" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerSubtitle}>Form Builder</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{title || 'New Custom Form'}</Text>
          </View>
        </View>
        <View style={styles.headerBottomActions}>
          <TouchableOpacity 
            style={styles.previewBtn} 
            onPress={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Ionicons name={isPreviewMode ? "create-outline" : "eye-outline"} size={18} color="#4B5563" style={{marginRight: 6}} />
            <Text style={styles.previewBtnText}>{isPreviewMode ? 'Edit' : 'Preview'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.publishBtn} onPress={handleSave}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{marginRight: 6}} />
            <Text style={styles.publishBtnText}>Publish Form</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content}>
        
        {isPreviewMode ? (
          <View style={styles.previewContainer}>
            <View style={styles.previewAlert}>
              <Ionicons name="eye" size={20} color="#043094" style={{marginRight: 8}} />
              <Text style={styles.previewAlertText}>You are previewing how users will see this form.</Text>
            </View>
            
            <View style={styles.previewLogoContainer}>
              <Image 
                source={require('../../../../assets/images/logo/company-logo.png')} 
                style={styles.previewLogo} 
              />
            </View>
            
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{title || 'Untitled Form'}</Text>
              {description ? <Text style={styles.previewDesc}>{description}</Text> : null}
            </View>
            
            {fields.map((field, idx) => (
              <View key={idx} style={styles.previewFieldCard}>
                <Text style={styles.previewFieldLabel}>
                  {field.label || 'Untitled Question'}
                  {field.required && <Text style={styles.requiredAsterisk}> *</Text>}
                </Text>
                
                {field.type === 'text' && (
                  <TextInput
                    style={styles.previewTextInput}
                    placeholder="Your answer"
                    placeholderTextColor="#9CA3AF"
                    editable={false}
                    // @ts-ignore
                    outlineStyle="none"
                  />
                )}
                
                {field.type === 'number' && (
                  <TextInput
                    style={styles.previewTextInput}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    editable={false}
                    // @ts-ignore
                    outlineStyle="none"
                  />
                )}
                
                {field.type === 'select' && (
                  <View style={styles.previewSelectContainer}>
                    {(field.options && field.options.length > 0 ? field.options : ['Option 1']).map((opt, oIdx) => (
                      <View key={oIdx} style={styles.previewOptionRow}>
                        <View style={styles.previewOptionRadio} />
                        <Text style={styles.previewOptionText}>{opt}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <React.Fragment>
            {/* Form Meta Information */}
        <View style={styles.metaContainer}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter Form Title..."
            placeholderTextColor="#9CA3AF"
            // @ts-ignore
            outlineStyle="none"
          />
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="What is the purpose of this form?"
            placeholderTextColor="#9CA3AF"
            multiline
            // @ts-ignore
            outlineStyle="none"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldsHeader}>
          <Text style={styles.sectionTitle}>Form Fields</Text>
          <Text style={styles.sectionSubtitle}>Design the questions for your form</Text>
        </View>

        {fields.map((field, index) => {
          const isActive = activeFieldIndex === index;

          if (!isActive) {
            // Collapsed State
            return (
              <TouchableOpacity 
                key={index} 
                activeOpacity={0.8}
                style={styles.collapsedCard}
                onPress={() => setActiveFieldIndex(index)}
              >
                <View style={styles.collapsedLeft}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.collapsedLabel} numberOfLines={1}>
                    {field.label || 'Untitled Question'}
                    {field.required && <Text style={styles.requiredAsterisk}> *</Text>}
                  </Text>
                </View>
                <View style={styles.collapsedRight}>
                  <View style={styles.typePill}>
                    <Ionicons 
                      name={fieldTypes.find(t => t.id === field.type)?.icon as any} 
                      size={14} 
                      color="#6B7280" 
                    />
                    <Text style={styles.typePillText}>
                      {fieldTypes.find(t => t.id === field.type)?.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color="#9CA3AF" style={{marginLeft: 8}} />
                </View>
              </TouchableOpacity>
            );
          }

          // Active Expanded State
          return (
            <View key={index} style={styles.activeCard}>
              <View style={styles.cardHeader}>
                <View style={styles.indexBadgeActive}>
                  <Text style={styles.indexBadgeTextActive}>{index + 1}</Text>
                </View>
                <Text style={styles.activeCardTitle}>Edit Field</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Question Label</Text>
                <TextInput
                  style={styles.questionInput}
                  value={field.label}
                  onChangeText={(text) => updateField(index, { label: text })}
                  placeholder="e.g., What is your name?"
                  placeholderTextColor="#9CA3AF"
                  // @ts-ignore
                  outlineStyle="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Field Type</Text>
                <View style={styles.typeSelectorRow}>
                  {fieldTypes.map(typeDef => {
                    const isSelected = field.type === typeDef.id;
                    return (
                      <TouchableOpacity 
                        key={typeDef.id}
                        style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                        onPress={() => {
                          updateField(index, { 
                            type: typeDef.id as any, 
                            options: typeDef.id === 'select' ? ['Option 1'] : undefined 
                          });
                        }}
                      >
                        <Ionicons 
                          name={typeDef.icon as any} 
                          size={18} 
                          color={isSelected ? '#043094' : '#6B7280'} 
                        />
                        <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextSelected]}>
                          {typeDef.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {field.type === 'select' && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.inputLabel}>Choices</Text>
                  {(field.options || []).map((opt, optIdx) => (
                    <View key={optIdx} style={styles.optionRow}>
                      <View style={styles.optionDot} />
                      <TextInput
                        style={styles.optionInput}
                        value={opt}
                        onChangeText={(text) => updateOption(index, optIdx, text)}
                        placeholder={`Option ${optIdx + 1}`}
                        // @ts-ignore
                        outlineStyle="none"
                      />
                      <TouchableOpacity onPress={() => removeOption(index, optIdx)} style={styles.removeOptionBtn}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addOptionBtn} onPress={() => addOption(index)}>
                    <Ionicons name="add" size={16} color="#043094" />
                    <Text style={styles.addOptionText}>Add Choice</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Required Field</Text>
                  <Switch
                    value={field.required}
                    onValueChange={(val) => updateField(index, { required: val })}
                    trackColor={{ false: "#E5E7EB", true: "#DBEAFE" }}
                    thumbColor={field.required ? "#043094" : "#fff"}
                  />
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => {
                    const newFields = [...fields];
                    newFields.splice(index + 1, 0, { ...field, name: `field_${Date.now()}` });
                    setFields(newFields);
                    setActiveFieldIndex(index + 1);
                  }} style={styles.iconBtn}>
                    <Ionicons name="copy-outline" size={18} color="#4B5563" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeField(index)} style={[styles.iconBtn, styles.iconBtnDanger]}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

          </React.Fragment>
        )}
      </ScrollView>

      {/* Floating Add Question Button */}
      {!isPreviewMode && (
        <TouchableOpacity style={styles.floatingAddBtn} onPress={handleAddField} activeOpacity={0.8}>
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  headerContainer: { backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', zIndex: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerTextContainer: { paddingLeft: 8 },
  headerSubtitle: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: 18, color: '#111827', fontWeight: '700', maxWidth: 300 },
  
  headerBottomActions: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 44 },
  previewBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  previewBtnText: { color: '#4B5563', fontWeight: '600', fontSize: 14 },
  publishBtn: { backgroundColor: '#043094', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  publishBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  scrollArea: { flex: 1 },
  content: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%', paddingBottom: 100 },
  
  metaContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  titleInput: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 12 },
  descInput: { fontSize: 15, color: '#4B5563', lineHeight: 22, minHeight: 60 },
  
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 32 },
  
  fieldsHeader: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#6B7280' },
  
  collapsedCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  collapsedLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  indexBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  indexBadgeText: { fontSize: 12, fontWeight: '700', color: '#4B5563' },
  collapsedLabel: { fontSize: 15, fontWeight: '500', color: '#374151', flex: 1 },
  requiredAsterisk: { color: '#EF4444' },
  collapsedRight: { flexDirection: 'row', alignItems: 'center' },
  typePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  typePillText: { fontSize: 12, color: '#4B5563', marginLeft: 6, fontWeight: '500' },
  
  activeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 2, borderColor: '#043094', shadowColor: '#043094', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  indexBadgeActive: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  indexBadgeTextActive: { fontSize: 12, fontWeight: '700', color: '#043094' },
  activeCardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  questionInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827' },
  
  typeSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  typeOptionSelected: { borderColor: '#043094', backgroundColor: '#EEF2FF' },
  typeOptionText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: '#4B5563' },
  typeOptionTextSelected: { color: '#043094', fontWeight: '600' },
  
  optionsContainer: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  optionDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#9CA3AF', marginRight: 12 },
  optionInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827' },
  removeOptionBtn: { padding: 8, marginLeft: 8, backgroundColor: '#FEF2F2', borderRadius: 6 },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#EEF2FF', borderRadius: 6, marginTop: 4 },
  addOptionText: { color: '#043094', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 20, marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginRight: 12 },
  
  actionButtons: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8 },
  iconBtnDanger: { backgroundColor: '#FEF2F2' },
  
  floatingAddBtn: { position: 'absolute', bottom: 32, right: 32, width: 64, height: 64, borderRadius: 32, backgroundColor: '#043094', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 100 },
  
  previewContainer: { paddingBottom: 40 },
  previewAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#C7D2FE' },
  previewAlertText: { color: '#043094', fontWeight: '600', fontSize: 14 },
  previewLogoContainer: { alignItems: 'center', marginBottom: 24 },
  previewLogo: { width: 140, height: 40, resizeMode: 'contain' },
  previewHeader: { backgroundColor: '#fff', padding: 32, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB', borderTopWidth: 6, borderTopColor: '#043094', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  previewTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 12 },
  previewDesc: { fontSize: 16, color: '#4B5563', lineHeight: 24 },
  previewFieldCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  previewFieldLabel: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 16 },
  previewTextInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827' },
  previewSelectContainer: { gap: 12 },
  previewOptionRow: { flexDirection: 'row', alignItems: 'center' },
  previewOptionRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 12 },
  previewOptionText: { fontSize: 15, color: '#374151' },
  
  successScreen: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { backgroundColor: '#fff', padding: 40, borderRadius: 24, alignItems: 'center', maxWidth: 500, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  successIconWrapper: { marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12, textAlign: 'center' },
  successDesc: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  successActions: { flexDirection: 'row', gap: 16, marginBottom: 40, width: '100%', justifyContent: 'center' },
  shareBtn: { alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#EEF2FF', borderRadius: 16, flex: 1, minHeight: 120, borderWidth: 1, borderColor: '#C7D2FE' },
  shareBtnCopied: { backgroundColor: '#D1FAE5', borderColor: '#34D399' },
  shareBtnText: { marginTop: 12, color: '#043094', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  returnBtn: { backgroundColor: '#043094', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  returnBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  qrCard: { backgroundColor: '#fff', padding: 32, borderRadius: 24, alignItems: 'center', width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.2, shadowRadius: 20, elevation: 15 },
  qrTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 24 },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  qrUrl: { fontSize: 13, color: '#6B7280', marginBottom: 24, paddingHorizontal: 16, textAlign: 'center' },
  closeQrBtn: { backgroundColor: '#F3F4F6', paddingVertical: 14, width: '100%', borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  closeQrBtnText: { color: '#4B5563', fontWeight: '600', fontSize: 16 },
  printBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, width: '100%', borderRadius: 12, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  printBtnText: { color: '#043094', fontWeight: '600', fontSize: 16 }
});
