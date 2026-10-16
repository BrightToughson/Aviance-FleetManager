import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Fix mojibake and encoding artifacts often found in raw text uploads
export function cleanUtf8(str: string): string {
  if (!str) return '';
  return str
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\s/g, '" ')
    .replace(/â€/g, '"')
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€¦/g, '…')
    .replace(/â€¢/g, '•')
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Â/g, '');
}

interface TableData {
  headers: string[];
  rows: string[][];
}

interface CodeBlockData {
  language: string;
  code: string;
}

type BlockItem =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'number'; num: string; text: string }
  | { type: 'task'; checked: boolean; text: string }
  | { type: 'table'; data: TableData }
  | { type: 'code'; data: CodeBlockData }
  | { type: 'divider' }
  | { type: 'spacer' }
  | { type: 'paragraph'; text: string };

function openExternalUrl(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank');
  } else {
    Linking.openURL(url).catch(err => console.warn('Could not open link:', err));
  }
}

// Inline Markdown Parser for bold, italic, code, links, and urls
export function renderInline(text: string, baseStyle?: any) {
  if (!text) return null;

  // Token pattern matching:
  // 1. Markdown link: [text](url)
  // 2. Bold Italic: ***text*** or ___text___
  // 3. Bold: **text** or __text__
  // 4. Inline code: `text`
  // 5. Italic: *text* or _text_
  // 6. Bare URL: https://... or http://...
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|https?:\/\/[^\s),]+)/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. Markdown link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      return (
        <Text
          key={index}
          style={[baseStyle, styles.inlineLink]}
          onPress={() => openExternalUrl(url)}
        >
          {label}
        </Text>
      );
    }

    // 2. Bold Italic: ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      return (
        <Text key={index} style={[baseStyle, styles.inlineBoldItalic]}>
          {part.slice(3, -3)}
        </Text>
      );
    }

    // 3. Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <Text key={index} style={[baseStyle, styles.inlineBold]}>
          {part.slice(2, -2)}
        </Text>
      );
    }

    // 4. Inline Code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <Text key={index} style={[baseStyle, styles.inlineCode]}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    // 5. Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <Text key={index} style={[baseStyle, styles.inlineItalic]}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    // 6. Bare URL: https://... or http://...
    if (/^https?:\/\//i.test(part)) {
      return (
        <Text
          key={index}
          style={[baseStyle, styles.inlineLink]}
          onPress={() => openExternalUrl(part)}
        >
          {part}
        </Text>
      );
    }

    // Standard plain text segment
    return (
      <Text key={index} style={baseStyle}>
        {part}
      </Text>
    );
  });
}

function CodeBlockCard({ data }: { data: CodeBlockData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <View style={styles.codeBlockContainer}>
      <View style={styles.codeBlockHeader}>
        <View style={styles.codeBlockLangBadge}>
          <Text style={styles.codeBlockLangText}>{data.language || 'CODE'}</Text>
        </View>
        <TouchableOpacity style={styles.codeCopyBtn} onPress={handleCopy}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? '#10B981' : '#94A3B8'} />
          <Text style={[styles.codeCopyText, copied && { color: '#10B981' }]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeScroll}>
        <Text style={styles.codeBlockText}>{data.code}</Text>
      </ScrollView>
    </View>
  );
}

function TableView({ data }: { data: TableData }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
      <View style={styles.tableCard}>
        {/* Header Row */}
        {data.headers.length > 0 && (
          <View style={styles.tableHeaderRow}>
            {data.headers.map((h, i) => (
              <View key={i} style={[styles.tableCell, styles.tableHeaderCell]}>
                <Text style={styles.tableHeaderText}>{h}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Data Rows */}
        {data.rows.map((row, rIdx) => (
          <View
            key={rIdx}
            style={[
              styles.tableRow,
              rIdx % 2 === 1 && styles.tableRowAlt,
              rIdx === data.rows.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            {row.map((cell, cIdx) => (
              <View key={cIdx} style={styles.tableCell}>
                <Text style={styles.tableCellText}>{renderInline(cell)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function MarkdownReader({
  content,
  viewMode = 'formatted',
}: {
  content: string;
  viewMode?: 'formatted' | 'raw';
}) {
  const cleaned = cleanUtf8(content);

  if (viewMode === 'raw') {
    return (
      <View style={styles.rawContainer}>
        <Text style={styles.rawText} selectable>
          {cleaned}
        </Text>
      </View>
    );
  }

  // Parse lines into block-level elements
  const rawLines = cleaned.split('\n');
  const blocks: BlockItem[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const line = rawLine.trim();

    // 1. Code Block Fence (```)
    if (line.startsWith('```')) {
      const language = line.replace(/^```/, '').trim().toUpperCase();
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      blocks.push({
        type: 'code',
        data: {
          language: language || 'PLAINTEXT',
          code: codeLines.join('\n'),
        },
      });
      i++; // Skip closing ```
      continue;
    }

    // 2. Table Block (lines containing |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (str: string) =>
          str
            .slice(1, -1)
            .split('|')
            .map(s => s.trim());

        const headers = parseRow(tableLines[0]);
        // Second line is separator (e.g. |---|---|)
        const isSeparator = tableLines[1].replace(/[-:\s|]/g, '').length === 0;
        const rowStartIdx = isSeparator ? 2 : 1;
        const rows = tableLines.slice(rowStartIdx).map(parseRow);

        blocks.push({
          type: 'table',
          data: { headers, rows },
        });
        continue;
      }
    }

    // 3. Empty Line -> Spacer
    if (!line) {
      blocks.push({ type: 'spacer' });
      i++;
      continue;
    }

    // 4. Headings
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.replace(/^#\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      blocks.push({ type: 'h4', text: line.replace(/^####\s+/, '') });
      i++;
      continue;
    }

    // 5. Horizontal rule / divider
    if (line.startsWith('---') || line.startsWith('***') || line.startsWith('___')) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // 6. Blockquote
    if (line.startsWith('>')) {
      blocks.push({ type: 'quote', text: line.replace(/^>\s*/, '') });
      i++;
      continue;
    }

    // 7. Task list (- [ ] or - [x])
    const taskMatch = line.match(/^[-*•]\s+\[([ xX])\]\s+(.*)/);
    if (taskMatch) {
      blocks.push({
        type: 'task',
        checked: taskMatch[1].toLowerCase() === 'x',
        text: taskMatch[2],
      });
      i++;
      continue;
    }

    // 8. Bullet list (- or * or •)
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      blocks.push({
        type: 'bullet',
        text: line.replace(/^[-*•]\s+/, ''),
      });
      i++;
      continue;
    }

    // 9. Numbered list (1. 2. etc.)
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push({
        type: 'number',
        num: numMatch[1],
        text: numMatch[2],
      });
      i++;
      continue;
    }

    // 10. Standard Paragraph
    blocks.push({ type: 'paragraph', text: rawLine });
    i++;
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'spacer':
            return <View key={idx} style={styles.spacer} />;

          case 'h1':
            return (
              <View key={idx} style={styles.h1Container}>
                <Text style={styles.h1Text}>{renderInline(block.text, styles.h1Text)}</Text>
                <View style={styles.h1Underline} />
              </View>
            );

          case 'h2':
            return (
              <View key={idx} style={styles.h2Container}>
                <View style={styles.h2AccentBar} />
                <Text style={styles.h2Text}>{renderInline(block.text, styles.h2Text)}</Text>
              </View>
            );

          case 'h3':
            return (
              <View key={idx} style={styles.h3Container}>
                <Text style={styles.h3Text}>{renderInline(block.text, styles.h3Text)}</Text>
              </View>
            );

          case 'h4':
            return (
              <View key={idx} style={styles.h4Container}>
                <Text style={styles.h4Text}>{renderInline(block.text, styles.h4Text)}</Text>
              </View>
            );

          case 'quote':
            return (
              <View key={idx} style={styles.quoteBox}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color="#043094" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.quoteText}>{renderInline(block.text, styles.quoteText)}</Text>
              </View>
            );

          case 'bullet':
            return (
              <View key={idx} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletContent}>{renderInline(block.text, styles.bulletContent)}</Text>
              </View>
            );

          case 'number':
            return (
              <View key={idx} style={styles.bulletRow}>
                <View style={styles.numBadge}>
                  <Text style={styles.numBadgeText}>{block.num}</Text>
                </View>
                <Text style={styles.bulletContent}>{renderInline(block.text, styles.bulletContent)}</Text>
              </View>
            );

          case 'task':
            return (
              <View key={idx} style={styles.taskRow}>
                <Ionicons
                  name={block.checked ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={block.checked ? '#10B981' : '#94A3B8'}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.bulletContent,
                    block.checked && { color: '#64748B', textDecorationLine: 'line-through' },
                  ]}
                >
                  {renderInline(block.text, styles.bulletContent)}
                </Text>
              </View>
            );

          case 'divider':
            return <View key={idx} style={styles.divider} />;

          case 'code':
            return <CodeBlockCard key={idx} data={block.data} />;

          case 'table':
            return <TableView key={idx} data={block.data} />;

          case 'paragraph':
          default:
            return (
              <Text key={idx} style={styles.paragraphText}>
                {renderInline(block.text, styles.paragraphText)}
              </Text>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  spacer: {
    height: 10,
  },
  h1Container: {
    marginTop: 8,
    marginBottom: 16,
  },
  h1Text: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  h1Underline: {
    height: 3,
    width: 60,
    backgroundColor: '#043094',
    borderRadius: 2,
    marginTop: 8,
  },
  h2Container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  h2AccentBar: {
    width: 4,
    height: 20,
    backgroundColor: '#043094',
    borderRadius: 2,
    marginRight: 8,
  },
  h2Text: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  h3Container: {
    marginTop: 16,
    marginBottom: 6,
  },
  h3Text: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 20,
  },
  h4Container: {
    marginTop: 12,
    marginBottom: 4,
  },
  h4Text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  quoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderLeftWidth: 4,
    borderLeftColor: '#043094',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginVertical: 8,
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#043094',
    marginTop: 8,
    marginRight: 10,
    marginLeft: 2,
  },
  numBadge: {
    minWidth: 20,
    paddingHorizontal: 4,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  numBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#043094',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  bulletContent: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  paragraphText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 18,
  },

  // Inline Token Styles
  inlineBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  inlineItalic: {
    fontStyle: 'italic',
  },
  inlineBoldItalic: {
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#0F172A',
  },
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    color: '#043094',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  inlineLink: {
    color: '#2563EB',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },

  // Code Block Card
  codeBlockContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    marginVertical: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  codeBlockLangBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBlockLangText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  codeCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  codeCopyText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  codeScroll: {
    padding: 12,
  },
  codeBlockText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    color: '#E2E8F0',
    lineHeight: 18,
  },

  // Tables
  tableScroll: {
    marginVertical: 12,
    maxWidth: '100%',
  },
  tableCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 420,
    backgroundColor: '#FFFFFF',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 120,
    justifyContent: 'center',
  },
  tableHeaderCell: {
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableCellText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },

  // Raw View
  rawContainer: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rawText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    color: '#1E293B',
    lineHeight: 18,
  },
});
