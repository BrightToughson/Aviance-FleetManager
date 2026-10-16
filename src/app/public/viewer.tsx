import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import MarkdownReader, { cleanUtf8 } from '../../components/MarkdownReader';

export default function StandaloneDocumentViewerScreen() {
  const router = useRouter();
  const { url, name, category } = useLocalSearchParams();

  const docUrl = Array.isArray(url) ? url[0] : url;
  const docName = (Array.isArray(name) ? name[0] : name) || 'Document';
  const docCategory = Array.isArray(category) ? category[0] : category;

  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  const fileExt = useMemo(() => {
    const src = docName || docUrl || '';
    const match = src.match(/\.([a-zA-Z0-9]+)($|\?)/);
    return match ? match[1].toLowerCase() : '';
  }, [docName, docUrl]);

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
    if (isText && docUrl) {
      setLoading(true);
      fetch(docUrl)
        .then(res => res.text())
        .then(text => {
          setTextContent(cleanUtf8(text));
        })
        .catch(err => {
          console.warn('Failed to load document text:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isText, docUrl]);

  const handleDownload = async () => {
    if (!docUrl) return;
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(docUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = blobUrl;
        a.download = docName;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch (e) {
        const a = window.document.createElement('a');
        a.href = docUrl;
        a.download = docName;
        a.target = '_blank';
        a.click();
      }
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    }
  };

  const handleCopy = () => {
    if (!textContent) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View style={styles.screenContainer}>
      
      {/* Top Standalone Navigation Bar */}
      <View style={styles.topNavbar}>
        <View style={styles.navbarLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="document-text" size={18} color="#043094" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.navDocTitle} numberOfLines={1}>{docName}</Text>
            {docCategory ? (
              <Text style={styles.navDocSub}>{docCategory} • Aviance Document Viewer</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.navbarRight}>
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

              <TouchableOpacity style={styles.actionNavBtn} onPress={handleCopy}>
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={copied ? "#10B981" : "#374151"} />
                <Text style={[styles.actionNavBtnText, copied && { color: '#10B981' }]}>
                  {copied ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.actionNavBtn} onPress={handlePrint}>
              <Ionicons name="print-outline" size={16} color="#374151" />
              <Text style={styles.actionNavBtnText}>Print</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.downloadPrimaryBtn} onPress={handleDownload}>
            <Ionicons name="cloud-download-outline" size={16} color="#fff" />
            <Text style={styles.downloadPrimaryBtnText}>Download</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Document Reading Canvas */}
      <View style={styles.viewerCanvas}>
        {isText ? (
          loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#043094" />
              <Text style={styles.loadingText}>Rendering document...</Text>
            </View>
          ) : textContent !== null ? (
            <ScrollView style={styles.scrollWrapper} contentContainerStyle={styles.scrollContent}>
              <View style={styles.paperSheet}>
                <MarkdownReader content={textContent} viewMode={viewMode} />
              </View>
            </ScrollView>
          ) : (
            <View style={styles.errorState}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorText}>Could not load document text</Text>
            </View>
          )
        ) : isPdf && Platform.OS === 'web' && docUrl ? (
          <View style={{ width: '100%', height: '100%' }}>
            <iframe 
              src={docUrl} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              title={docName} 
            />
          </View>
        ) : isOffice && Platform.OS === 'web' && docUrl ? (
          <View style={{ width: '100%', height: '100%' }}>
            <iframe 
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}&embedded=true`} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              title={docName} 
            />
          </View>
        ) : isImage && docUrl ? (
          <ScrollView contentContainerStyle={styles.imageCanvas}>
            <Image source={{ uri: docUrl }} style={styles.fullImageView} resizeMode="contain" />
          </ScrollView>
        ) : (
          <View style={styles.errorState}>
            <Ionicons name="document-text-outline" size={60} color="#043094" />
            <Text style={styles.errorText}>{docName}</Text>
            <TouchableOpacity style={styles.downloadPrimaryBtn} onPress={handleDownload}>
              <Ionicons name="cloud-download-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadPrimaryBtnText}>Download File</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topNavbar: {
    height: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  navbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  navDocTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  navDocSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  actionNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  actionNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  downloadPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#043094',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  downloadPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  viewerCanvas: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  paperSheet: {
    width: '100%',
    maxWidth: 900,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 48,
    paddingHorizontal: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  textDocumentBody: {
    width: '100%',
  },
  headingBlock: {
    marginBottom: 8,
  },
  textH1: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headingDivider: {
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 16,
  },
  textH2: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  textH3: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  textParagraph: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 8,
  },
  textBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 6,
  },
  textBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#043094',
    marginTop: 9,
    marginRight: 12,
  },
  listNumBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#043094',
    marginRight: 8,
    marginTop: 1,
  },
  textBulletContent: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  textQuoteBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#043094',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 10,
    borderRadius: 4,
  },
  textQuoteContent: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  codeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  rawTextCode: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 22,
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },

  imageCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fullImageView: {
    width: '90%',
    height: '90%',
  },

  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
});
