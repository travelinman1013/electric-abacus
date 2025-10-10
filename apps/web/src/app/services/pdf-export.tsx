import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ReportSummary, WeeklySales, WeekDay } from '@domain/costing';
import { calculateGrossMargin, calculateGrossProfit, WEEK_DAYS } from '@domain/costing';

interface PDFExportData {
  weekId: string;
  summary: ReportSummary;
  sales?: WeeklySales;
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
    borderBottom: '1px solid #e5e7eb',
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
    border: '1px solid #e5e7eb',
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
    borderBottom: '1px solid #d1d5db',
    padding: 8
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
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
    borderTop: '1px solid #e5e7eb',
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

const calculateDayGross = (day: { foodSales: number; drinkSales: number }) => {
  return (day.foodSales || 0) + (day.drinkSales || 0);
};

const calculateDayNet = (day: { foodSales: number; drinkSales: number; lessSalesTax: number; lessPromo: number }) => {
  const gross = calculateDayGross(day);
  return gross - (day.lessSalesTax || 0) - (day.lessPromo || 0);
};

const dayLabels: Record<WeekDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

const WeekReportDocument = ({ weekId, summary, sales, finalizedAt, finalizedBy, ingredientNames, sourceVersions }: PDFExportData) => {
  // Calculate sales totals
  const salesTotals = sales?.days ? WEEK_DAYS.reduce((acc, day) => {
    const dayData = sales.days[day];
    const gross = calculateDayGross(dayData);
    const net = calculateDayNet(dayData);
    acc.grossSales += gross;
    acc.lessSalesTax += dayData.lessSalesTax || 0;
    acc.lessPromo += dayData.lessPromo || 0;
    acc.netSales += net;
    return acc;
  }, { grossSales: 0, lessSalesTax: 0, lessPromo: 0, netSales: 0 }) : null;

  // Calculate food cost percentage
  const foodCostPercentage = salesTotals && salesTotals.grossSales > 0
    ? ((summary.totals.totalCostOfSales / salesTotals.grossSales) * 100).toFixed(2)
    : null;

  // Calculate gross profit and margin
  const grossProfit = salesTotals
    ? calculateGrossProfit(salesTotals.grossSales, summary.totals.totalCostOfSales)
    : null;

  const grossMargin = salesTotals
    ? calculateGrossMargin(salesTotals.grossSales, summary.totals.totalCostOfSales)
    : null;

  return (
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

      {/* Sales Summary */}
      {sales?.days && salesTotals && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales Summary</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.tableCell}>
                <Text style={styles.tableHeaderText}>Day</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={styles.tableHeaderText}>Gross Sales</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={styles.tableHeaderText}>Less Tax</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={styles.tableHeaderText}>Less Promo</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={styles.tableHeaderText}>Net Sales</Text>
              </View>
            </View>

            {/* Daily Rows */}
            {WEEK_DAYS.map((day) => {
              const dayData = sales.days[day];
              const gross = calculateDayGross(dayData);
              const net = calculateDayNet(dayData);
              return (
                <View key={day} style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text>{dayLabels[day]}</Text>
                  </View>
                  <View style={styles.tableCellRight}>
                    <Text>{formatCurrency(gross)}</Text>
                  </View>
                  <View style={styles.tableCellRight}>
                    <Text>{formatCurrency(dayData.lessSalesTax || 0)}</Text>
                  </View>
                  <View style={styles.tableCellRight}>
                    <Text>{formatCurrency(dayData.lessPromo || 0)}</Text>
                  </View>
                  <View style={styles.tableCellRight}>
                    <Text>{formatCurrency(net)}</Text>
                  </View>
                </View>
              );
            })}

            {/* Totals Row */}
            <View style={[styles.tableRow, { backgroundColor: '#f3f4f6', fontWeight: 'bold' }]}>
              <View style={styles.tableCell}>
                <Text style={styles.tableHeaderText}>TOTAL</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={styles.tableHeaderText}>{formatCurrency(salesTotals.grossSales)}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={styles.tableHeaderText}>{formatCurrency(salesTotals.lessSalesTax)}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={styles.tableHeaderText}>{formatCurrency(salesTotals.lessPromo)}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={styles.tableHeaderText}>{formatCurrency(salesTotals.netSales)}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Cost Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Cost Summary</Text>
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
            <Text style={styles.summaryLabel}>Food Cost %</Text>
            <Text style={styles.summaryValue}>
              {foodCostPercentage ? `${foodCostPercentage}%` : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Profitability Section */}
      {grossProfit !== null && grossMargin !== null && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profitability</Text>
          <View style={[styles.summaryGrid, { gap: 20 }]}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Gross Profit</Text>
              <Text style={styles.summaryValue}>{formatCurrency(grossProfit)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Gross Margin</Text>
              <Text style={styles.summaryValue}>{grossMargin.toFixed(2)}%</Text>
            </View>
          </View>
        </View>
      )}

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

          {/* Totals Row */}
          <View style={[styles.tableRow, { backgroundColor: '#f3f4f6', fontWeight: 'bold' }]}>
            <View style={styles.tableCell}>
              <Text style={styles.tableHeaderText}>TOTAL</Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text style={styles.tableHeaderText}>{summary.totals.totalUsageUnits.toFixed(2)}</Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text></Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text style={styles.tableHeaderText}>{formatCurrency(summary.totals.totalCostOfSales)}</Text>
            </View>
            <View style={styles.tableCellCenter}>
              <Text></Text>
            </View>
          </View>
        </View>
      </View>

      {/* Cost Analysis */}
      {foodCostPercentage && salesTotals && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Analysis</Text>
          <View style={{ padding: 10, backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4 }}>
            <Text style={{ fontSize: 10, marginBottom: 5, color: '#6b7280' }}>
              Food Cost Percentage
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 9, color: '#374151' }}>
                Total Food Cost: {formatCurrency(summary.totals.totalCostOfSales)}
              </Text>
              <Text style={{ fontSize: 9, color: '#6b7280' }}>÷</Text>
              <Text style={{ fontSize: 9, color: '#374151' }}>
                Gross Sales: {formatCurrency(salesTotals.grossSales)}
              </Text>
              <Text style={{ fontSize: 9, color: '#6b7280' }}>=</Text>
              <Text style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: parseFloat(foodCostPercentage) < 30
                  ? '#059669'
                  : parseFloat(foodCostPercentage) < 35
                    ? '#d97706'
                    : '#dc2626'
              }}>
                {foodCostPercentage}%
              </Text>
            </View>
            <Text style={{ fontSize: 8, marginTop: 5, color: '#6b7280' }}>
              Target: &lt;30% (excellent) | 30-35% (acceptable) | &gt;35% (needs attention)
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Taco Ray v2 - Weekly Operations Management System
      </Text>
    </Page>
  </Document>
  );
};

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