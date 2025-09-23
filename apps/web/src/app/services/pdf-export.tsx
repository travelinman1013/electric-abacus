import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ReportSummary } from '@domain/costing';

interface PDFExportData {
  weekId: string;
  summary: ReportSummary;
  finalizedAt?: string;
  finalizedBy?: string;
  ingredientNames: Record<string, string>;
  sourceVersions: Record<string, string>;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 30,
    backgroundColor: '#ffffff'
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderColor: '#e5e7eb',
    paddingBottom: 10
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1f2937'
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 3
  },
  section: {
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151'
  },
  summaryGrid: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 20
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9fafb',
    border: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 3
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  table: {
    width: '100%'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottom: 1,
    borderColor: '#d1d5db',
    padding: 8
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderColor: '#e5e7eb',
    padding: 8
  },
  tableCell: {
    flex: 1,
    fontSize: 9
  },
  tableCellRight: {
    flex: 1,
    fontSize: 9,
    textAlign: 'right'
  },
  tableCellCenter: {
    flex: 1,
    fontSize: 9,
    textAlign: 'center'
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#374151'
  },
  versionBadge: {
    fontSize: 8,
    backgroundColor: '#e5e7eb',
    padding: 2,
    borderRadius: 2,
    color: '#6b7280'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: 1,
    borderColor: '#e5e7eb',
    paddingTop: 10
  }
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatDate = (date: string | undefined) => {
  if (!date) return 'Not specified';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const WeekReportDocument = ({ weekId, summary, finalizedAt, finalizedBy, ingredientNames, sourceVersions }: PDFExportData) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Cost Report - {weekId}</Text>
        <Text style={styles.subtitle}>Generated on {new Date().toLocaleDateString('en-US')}</Text>
        {finalizedAt && (
          <Text style={styles.subtitle}>
            Finalized on {formatDate(finalizedAt)}
            {finalizedBy && ` by ${finalizedBy}`}
          </Text>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cost Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Usage Units</Text>
            <Text style={styles.summaryValue}>{summary.totals.totalUsageUnits.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Cost of Sales</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totals.totalCostOfSales)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Ingredients</Text>
            <Text style={styles.summaryValue}>{summary.breakdown.length}</Text>
          </View>
        </View>
      </View>

      {/* Detailed Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredient Cost Breakdown</Text>
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.tableCell}>
              <Text style={styles.tableHeaderText}>Ingredient</Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text style={styles.tableHeaderText}>Usage</Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text style={styles.tableHeaderText}>Unit Cost</Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text style={styles.tableHeaderText}>Cost of Sales</Text>
            </View>
            <View style={styles.tableCellCenter}>
              <Text style={styles.tableHeaderText}>Version</Text>
            </View>
          </View>

          {/* Table Rows */}
          {summary.breakdown.map((item) => (
            <View key={item.ingredientId} style={styles.tableRow}>
              <View style={styles.tableCell}>
                <Text>{ingredientNames[item.ingredientId] || item.ingredientId}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text>{item.usage.toFixed(2)}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text>{formatCurrency(item.unitCost)}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text>{formatCurrency(item.costOfSales)}</Text>
              </View>
              <View style={styles.tableCellCenter}>
                <Text style={styles.versionBadge}>
                  {sourceVersions[item.ingredientId] || 'unspecified'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Taco Ray v2 - Weekly Operations Management System
      </Text>
    </Page>
  </Document>
);

export const generateWeekReportPDF = async (data: PDFExportData): Promise<Blob> => {
  const doc = <WeekReportDocument {...data} />;
  const pdfBlob = await pdf(doc).toBlob();
  return pdfBlob;
};

export const downloadWeekReportPDF = async (data: PDFExportData): Promise<void> => {
  const pdfBlob = await generateWeekReportPDF(data);
  const url = URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `week-report-${data.weekId}-${new Date().toISOString().split('T')[0]}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};