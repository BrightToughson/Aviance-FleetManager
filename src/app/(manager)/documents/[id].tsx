import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, useWindowDimensions, Image, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDocuments } from '../../../context/DocumentsContext';
import { useTranslation } from 'react-i18next';
import MarkdownReader, { cleanUtf8 } from '../../../components/MarkdownReader';

export default function DocumentDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 1024;

  const { documents, deleteDocument, totalUsedMB, remainingMB, maxStorageMB } = useDocuments();
  const document = useMemo(() => documents.find(d => d.id === id), [documents, id]);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  const fileExt = useMemo(() => {
    if (!document) return '';
    const src = document.name || document.url || '';
    const match = src.match(/\.([a-zA-Z0-9]+)($|\?)/);
    return match ? match[1].toLowerCase() : '';
  }, [document]);

  const isImage = useMemo(() => {
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(fileExt);
  }, [fileExt]);

  const isPdf = useMemo(() => {
    return fileExt === 'pdf';
  }, [fileExt]);

  const isText = useMemo(() => {
    return ['md', 'markdown', 'txt', 'text', 'csv', 'json', 'log'].includes(fileExt);
  }, [fileExt]);

  const isOffice = useMemo(() => {
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExt);
  }, [fileExt]);

  useEffect(() => {
    if (isText && document?.url) {
      setLoadingText(true);
      fetch(document.url)
        .then(res => res.text())
        .then(text => {
          setTextContent(cleanUtf8(text));
        })
        .catch(err => {
          console.warn('Failed to load text document:', err);
        })
        .finally(() => {
          setLoadingText(false);
        });
    }
  }, [isText, document?.url]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(manager)/documents' as any);
    }
  };

  if (!document) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('doc_not_found', 'Document not found')}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>{t('common_go_back', 'Go Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    const confirmDelete = () => {
      deleteDocument(document.id);
      if (Platform.OS === 'web') window.alert(t('doc_deleted', 'Document deleted'));
      router.replace('/(manager)/documents' as any);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('doc_delete_confirm', 'Are you sure you want to delete this document?'))) confirmDelete();
    } else {
      Alert.alert(t('doc_delete_title', 'Delete Document'), t('doc_delete_confirm', 'Are you sure you want to delete this document?'), [
        { text: t('common_cancel', 'Cancel'), style: 'cancel' },
        { text: t('common_delete', 'Delete'), style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  const handleDownload = async () => {
    if (!document?.url) return;
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(document.url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = blobUrl;
        a.download = document.name || 'document';
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
        const a = window.document.createElement('a');
        a.href = document.url;
        a.download = document.name || 'document';
        a.target = '_blank';
        a.click();
      }
    } else {
      Linking.openURL(document.url);
    }
  };

  const handleOpenTab = () => {
    if (!document?.url) return;
    if (Platform.OS === 'web') {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const viewerUrl = `${origin}/public/viewer?url=${encodeURIComponent(document.url)}&name=${encodeURIComponent(document.name)}&category=${encodeURIComponent(document.category || '')}`;
      window.open(viewerUrl, '_blank');
    } else {
      Linking.openURL(document.url);
    }
  };

  const handleCopyText = () => {
    if (!textContent) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isMobile && { padding: 16 }]}>
      
      {/* Page Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{document.name}</Text>
            <View style={styles.headerBadgesRow}>
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>{document.category || 'General'}</Text>
              </View>
              <Text style={styles.subtitle}>Linked to: {document.linkedTo}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={17} color="#EF4444" />
            <Text style={styles.deleteBtnText}>{t('common_delete', 'Delete')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
            <Ionicons name="cloud-download-outline" size={17} color="#fff" />
            <Text style={styles.downloadBtnText}>{t('common_download', 'Download')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.mainGrid, isMobile && styles.mainGridMobile]}>
        
        {/* Left Column: File Properties */}
        <View style={[styles.leftCol, isMobile ? styles.leftColMobile : styles.leftColDesktop]}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('doc_props', 'Document Details')}</Text>
            
            <View style={styles.propItem}>
              <Text style={styles.propLabel}>{t('doc_prop_upload_date', 'Uploaded Date')}</Text>
              <Text style={styles.propValue}>{document.date}</Text>
            </View>

            <View style={styles.propItem}>
              <Text style={styles.propLabel}>{t('doc_prop_size', 'File Size')}</Text>
              <Text style={styles.propValue}>{document.size}</Text>
            </View>
            
            <View style={styles.propItem}>
              <Text style={styles.propLabel}>{t('doc_prop_linked', 'Linked Entity')}</Text>
              <View style={styles.linkedBadge}>
                <Ionicons name="business-outline" size={13} color="#043094" />
                <Text style={styles.linkedBadgeText}>{document.linkedTo}</Text>
              </View>
            </View>

            <View style={styles.propItem}>
              <Text style={styles.propLabel}>File Type</Text>
              <Text style={styles.propValue}>{fileExt ? fileExt.toUpperCase() : 'Document'}</Text>
            </View>

            {document.expDate && (
              <View style={[styles.propItem, { borderBottomWidth: 0 }]}>
                <Text style={styles.propLabel}>{t('doc_prop_exp', 'Expiration Date')}</Text>
                <Text style={[styles.propValue, { color: '#DC2626' }]}>{document.expDate}</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.infoBox}>
              <Ionicons name="server-outline" size={24} color="#043094" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.infoTitle}>Fleet Storage</Text>
                <Text style={styles.infoText}>
                  {totalUsedMB.toFixed(2)} MB of {maxStorageMB} MB used ({remainingMB.toFixed(2)} MB available).
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: In-App Document Viewer */}
        <View style={[styles.rightCol, isMobile ? styles.rightColMobile : styles.rightColDesktop]}>
          <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
            
            {/* Viewer Toolbar Header */}
            <View style={styles.viewerToolbar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={styles.formatPill}>
                  <Text style={styles.formatPillText}>
                    {isImage ? 'IMAGE' : isPdf ? 'PDF' : isText ? 'DOCUMENT READER' : isOffice ? 'OFFICE' : (fileExt.toUpperCase() || 'FILE')}
                  </Text>
                </View>
                <Text style={styles.viewerDocTitle} numberOfLines={1}>{document.name}</Text>
              </View>

              <View style={styles.viewerActionsRow}>
                {isText && textContent && (
                  <>
                    <View style={styles.toggleGroup}>
                      <TouchableOpacity 
                        style={[styles.toggleBtn, viewMode === 'formatted' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('formatted')}
                      >
                        <Text style={[styles.toggleBtnText, viewMode === 'formatted' && styles.toggleBtnTextActive]}>Formatted</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.toggleBtn, viewMode === 'raw' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('raw')}
                      >
                        <Text style={[styles.toggleBtnText, viewMode === 'raw' && styles.toggleBtnTextActive]}>Raw Text</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.toolbarIconBtn} onPress={handleCopyText}>
                      <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={copied ? "#10B981" : "#4B5563"} />
                      <Text style={[styles.toolbarBtnText, copied && { color: "#10B981" }]}>
                        {copied ? 'Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity style={styles.toolbarIconBtn} onPress={handleOpenTab}>
                  <Ionicons name="open-outline" size={16} color="#043094" />
                  <Text style={[styles.toolbarBtnText, { color: '#043094' }]}>Open Tab</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Viewer Content Area */}
            <View style={styles.previewContainer}>
              
              {/* 1. TEXT / MARKDOWN READER */}
              {isText ? (
                loadingText ? (
                  <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color="#043094" />
                    <Text style={styles.loadingText}>Reading document content...</Text>
                  </View>
                ) : textContent !== null ? (
                  <ScrollView style={styles.textReaderScroll} contentContainerStyle={styles.textReaderPadding}>
                    <View style={styles.paperContainer}>
                      <MarkdownReader content={textContent} viewMode={viewMode} />
                    </View>
                  </ScrollView>
                ) : (
                  <View style={styles.genericPreview}>
                    <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.genericPreviewText}>Could not load text preview</Text>
                    <TouchableOpacity style={styles.downloadActionBtn} onPress={handleDownload}>
                      <Text style={styles.downloadActionBtnText}>Open Document</Text>
                    </TouchableOpacity>
                  </View>
                )

              /* 2. PDF VIEWER (Embed on Web) */
              ) : isPdf && Platform.OS === 'web' && document.url ? (
                <View style={{ width: '100%', height: 650 }}>
                  <iframe 
                    src={document.url} 
                    style={{ width: '100%', height: '100%', border: 'none' }} 
                    title={document.name}
                  />
                </View>

              /* 3. OFFICE DOCUMENT VIEWER (Google Docs Viewer on Web) */
              ) : isOffice && Platform.OS === 'web' && document.url ? (
                <View style={{ width: '100%', height: 650 }}>
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(document.url)}&embedded=true`} 
                    style={{ width: '100%', height: '100%', border: 'none' }} 
                    title={document.name}
                  />
                </View>

              /* 4. IMAGE VIEWER */
              ) : isImage && document.url ? (
                <View style={styles.imageViewerBox}>
                  <Image source={{ uri: document.url }} style={styles.previewImage} resizeMode="contain" />
                </View>

              /* 5. GENERIC / FALLBACK PREVIEW */
              ) : (
                <View style={styles.genericPreview}>
                  <View style={styles.genericIconCircle}>
                    <Ionicons name="document-text" size={44} color="#043094" />
                  </View>
                  <Text style={styles.genericPreviewText}>{document.name}</Text>
                  <Text style={styles.genericPreviewSubtext}>
                    Click below to open or download this file.
                  </Text>
                  
                  <TouchableOpacity style={styles.downloadActionBtn} onPress={handleDownload}>
                    <Ionicons name="cloud-download-outline" size={16} color="#043094" style={{ marginRight: 6 }} />
                    <Text style={styles.downloadActionBtnText}>Download {document.size}</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>

          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#EF4444', marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: '#E5E7EB', borderRadius: 8 },
  backBtnText: { color: '#374151', fontWeight: '600' },
  
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { padding: 24, maxWidth: 1200, marginHorizontal: 'auto', width: '100%', paddingBottom: 64 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 260 },
  headerBackBtn: { marginRight: 14, padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  headerBadgesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  idBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#E0E7FF' },
  idBadgeText: { fontSize: 12, fontWeight: '600', color: '#043094' },
  subtitle: { fontSize: 13, color: '#64748B' },
  
  headerActions: { flexDirection: 'row', gap: 10 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  deleteBtnText: { marginLeft: 6, color: '#DC2626', fontWeight: '600', fontSize: 13 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#043094', borderRadius: 8 },
  downloadBtnText: { marginLeft: 6, color: '#fff', fontWeight: '600', fontSize: 13 },
  
  mainGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  mainGridMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 24 },
  leftCol: { gap: 24 },
  leftColDesktop: { width: 340 },
  leftColMobile: { width: '100%' },
  rightCol: { gap: 24 },
  rightColDesktop: { flex: 1 },
  rightColMobile: { width: '100%' },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 16 },
  
  propItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  propLabel: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  propValue: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  linkedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  linkedBadgeText: { fontSize: 12, fontWeight: '600', color: '#043094' },
  
  infoBox: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'flex-start' },
  infoTitle: { fontWeight: '600', color: '#0F172A', marginBottom: 2, fontSize: 13 },
  infoText: { fontSize: 12, color: '#64748B', lineHeight: 18 },

  viewerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexWrap: 'wrap',
    gap: 10,
  },
  formatPill: {
    backgroundColor: '#043094',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formatPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  viewerDocTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flexShrink: 1,
  },
  viewerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
  },
  toggleBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  toggleBtnTextActive: {
    color: '#0F172A',
    fontWeight: '600',
  },
  toolbarIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },

  previewContainer: {
    minHeight: 520,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },

  textReaderScroll: {
    width: '100%',
    maxHeight: 650,
  },
  textReaderPadding: {
    padding: 24,
  },
  paperContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  textDocumentBody: {
    width: '100%',
  },
  headingBlock: {
    marginBottom: 6,
  },
  textH1: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headingDivider: {
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 12,
  },
  textH2: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  textH3: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  textParagraph: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 6,
  },
  textBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  textBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#043094',
    marginTop: 8,
    marginRight: 10,
  },
  listNumBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#043094',
    marginRight: 8,
    marginTop: 1,
  },
  textBulletContent: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  textQuoteBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#043094',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderRadius: 4,
  },
  textQuoteContent: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  codeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  rawTextContent: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 20,
  },

  imageViewerBox: {
    width: '100%',
    height: 520,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },

  genericPreview: {
    alignItems: 'center',
    padding: 40,
    maxWidth: 400,
  },
  genericIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  genericPreviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  genericPreviewSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  downloadActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  downloadActionBtnText: {
    color: '#043094',
    fontWeight: '600',
    fontSize: 13,
  },
});
