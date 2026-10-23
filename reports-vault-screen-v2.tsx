import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Modal,
} from 'react-native';

interface VaultDocument {
  id: string;
  title: string;
  type: 'PDF' | 'JSON' | 'CSV';
  date: string;
  size: string;
  hash: string;
}

/**
 * Offline Telemetry & Reports Vault v2 - Enhanced with Export Animations,
 * Interactive Document Filter Pills, and Cryptographic Hash Inspectors.
 */
export const ReportsVaultScreenV2: React.FC = () => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<VaultDocument | null>(null);

  const [documents, setDocuments] = useState<VaultDocument[]>([
    {
      id: '1',
      title: 'Compliance_Audit_Report_20261023.pdf',
      type: 'PDF',
      date: '2026-10-23 02:21',
      size: '2.4 MB',
      hash: 'a1b2c3d4e5f678901234567890abcdefa1b2c3d4e5f678901234567890abcdef',
    },
    {
      id: '2',
      title: 'Privileged_Ledger_Export_Full.json',
      type: 'JSON',
      date: '2026-10-23 02:28',
      size: '1.1 MB',
      hash: '5ef5f9f24bf62631560aff351febe0bb73be25c925b9a29cfb69223cb243bcc6',
    },
    {
      id: '3',
      title: 'BMS_Power_Telemetry_Log.csv',
      type: 'CSV',
      date: '2026-10-22 18:45',
      size: '840 KB',
      hash: '73be25c925b9a29cfb69223cb243bcc6c8e4e7f78dedfd7c5daa9f892774ae02',
    },
  ]);

  // Animated Value
  const exportProgressAnim = useRef(new Animated.Value(0)).current;

  const handleGenerateReport = () => {
    setIsExporting(true);
    exportProgressAnim.setValue(0);

    Animated.timing(exportProgressAnim, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: false,
    }).start(() => {
      setIsExporting(false);
      const newDoc: VaultDocument = {
        id: Date.now().toString(),
        title: `E2E_Compliance_Summary_${Date.now().toString().slice(-4)}.pdf`,
        type: 'PDF',
        date: 'Just Now',
        size: '1.8 MB',
        hash: '882194a1b2c3d4e5f67890abcdefa1b2c3d4e5f678901234567890abcdef1234',
      };
      setDocuments((prev) => [newDoc, ...prev]);
    });
  };

  const filteredDocs = documents.filter((doc) => {
    if (selectedFilter === 'ALL') return true;
    return doc.type === selectedFilter;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📂 OFFLINE TELEMETRY & REPORTS VAULT</Text>
        <Text style={styles.headerSub}>CRYPTOGRAPHICALLY SIGNED AUDIT ARCHIVE</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Report Generator Action Card */}
        <View style={styles.generatorCard}>
          <Text style={styles.cardTitle}>COMPLIANCE REPORT GENERATOR</Text>
          <Text style={styles.cardSub}>Compile E2E host metrics, AVB hashes, and ledger logs into static PDF</Text>

          {isExporting && (
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: exportProgressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.generateBtn, isExporting && styles.generateBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleGenerateReport}
            disabled={isExporting}
          >
            <Text style={styles.generateBtnText}>
              {isExporting ? '⏳ COMPILING AUDIT REPORT...' : '⚡ GENERATE COMPLIANCE PDF REPORT'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['ALL', 'PDF', 'JSON', 'CSV'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterPill, selectedFilter === type && styles.filterPillActive]}
              onPress={() => setSelectedFilter(type)}
            >
              <Text style={[styles.filterText, selectedFilter === type && styles.filterTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Document List */}
        <Text style={styles.sectionTitle}>ARCHIVED DOCUMENTS ({filteredDocs.length})</Text>
        {filteredDocs.map((doc) => (
          <TouchableOpacity
            key={doc.id}
            style={styles.docCard}
            activeOpacity={0.85}
            onPress={() => setSelectedDoc(doc)}
          >
            <View style={styles.docHeader}>
              <View style={styles.docTypeBadge}>
                <Text style={styles.docTypeText}>{doc.type}</Text>
              </View>
              <Text style={styles.docDate}>{doc.date} • {doc.size}</Text>
            </View>

            <Text style={styles.docTitle}>{doc.title}</Text>
            <Text style={styles.docHash}>SHA-256: {doc.hash.substring(0, 24)}...</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Document Inspector Modal */}
      {selectedDoc && (
        <Modal transparent animationType="slide" visible={!!selectedDoc}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedDoc.title}</Text>
              <Text style={styles.modalSub}>Type: {selectedDoc.type} | Size: {selectedDoc.size} | Date: {selectedDoc.date}</Text>

              <Text style={styles.modalLabel}>Cryptographic Signature Hash:</Text>
              <Text style={styles.modalMonospace}>{selectedDoc.hash}</Text>

              <TouchableOpacity style={styles.downloadBtn}>
                <Text style={styles.downloadBtnText}>📥 EXPORT DOCUMENT TO STUDIO</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDoc(null)}>
                <Text style={styles.closeBtnText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#388BFD',
    letterSpacing: 1,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
  },
  generatorCard: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B949E',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 11,
    color: '#C9D1D9',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#21262D',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#388BFD',
    borderRadius: 3,
  },
  generateBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#388BFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: '#21262D',
  },
  generateBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F0F6FC',
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
  },
  filterPillActive: {
    backgroundColor: '#388BFD',
    borderColor: '#388BFD',
  },
  filterText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B949E',
  },
  filterTextActive: {
    color: '#F0F6FC',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B949E',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  docCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
    padding: 14,
    marginBottom: 12,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  docTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#388BFD20',
  },
  docTypeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#58A6FF',
  },
  docDate: {
    fontSize: 10,
    color: '#8B949E',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F0F6FC',
    marginBottom: 4,
  },
  docHash: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#8B949E',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161B22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F0F6FC',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 11,
    color: '#8B949E',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    color: '#8B949E',
    marginBottom: 4,
  },
  modalMonospace: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#58A6FF',
    backgroundColor: '#0D1117',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  downloadBtn: {
    height: 44,
    backgroundColor: '#3FB950',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0D1117',
  },
  closeBtn: {
    height: 44,
    backgroundColor: '#21262D',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B949E',
  },
});
