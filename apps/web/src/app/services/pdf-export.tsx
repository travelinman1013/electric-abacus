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
  ingredientCategories?: Record<string, string>;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    padding: 40,
    backgroundColor: '#ffffff',
    lineHeight: 1.4
  },
  header: {
    marginBottom: 25,
    borderBottom: '2px solid #1f2937',
    paddingBottom: 12,
    backgroundColor: '#f9fafb',
    padding: 20,
    borderRadius: 4
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#111827'
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 3,
    lineHeight: 1.5
  },
  section: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111827',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: 6
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 15
  },
  summaryCard: {
    flex: 1,
    padding: 14,
    backgroundColor: '#f9fafb',
    border: '1.5px solid #d1d5db',
    borderRadius: 6
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 1.2
  },
  table: {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 4
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    padding: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: 10
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: '1px solid #e5e7eb',
    padding: 10,
    backgroundColor: '#f9fafb'
  },
  tableCell: {
    flex: 1,
    fontSize: 10
  },
  tableCellRight: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right'
  },
  tableCellCenter: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center'
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#ffffff'
  },
  versionBadge: {
    fontSize: 8,
    backgroundColor: '#e5e7eb',
    padding: '3 6',
    borderRadius: 3,
    color: '#6b7280'
  },
  categoryHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    padding: 10,
    borderTop: '1px solid #d1d5db'
  },
  categoryHeaderText: {
    fontWeight: 'bold',
    fontSize: 11,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    borderTop: '1px solid #e5e7eb',
    paddingTop: 10
  },
  executiveSummary: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #3b82f6',
    borderRadius: 6,
    padding: 18,
    marginBottom: 25
  },
  executiveTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 12
  },
  keyMetricRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10
  },
  keyMetric: {
    flex: 1
  },
  keyMetricLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  keyMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  badge: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  badgeGreen: {
    backgroundColor: '#d1fae5',
    color: '#065f46'
  },
  badgeYellow: {
    backgroundColor: '#fef3c7',
    color: '#92400e'
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
    color: '#991b1b'
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

const categoryLabels: Record<string, string> = {
  food: 'Food Ingredients',
  paper: 'Paper & Supplies',
  other: 'Other Items'
};

const categoryOrder = ['food', 'paper', 'other'];

const WeekReportDocument = ({ weekId, summary, sales, finalizedAt, finalizedBy, ingredientNames, sourceVersions, ingredientCategories }: PDFExportData) => {
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
        <Text style={styles.title}>Weekly Operations Report</Text>
        <Text style={styles.subtitle}>Week: {weekId}</Text>
        <Text style={styles.subtitle}>Generated: {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</Text>
        {finalizedAt && (
          <Text style={styles.subtitle}>
            Finalized: {formatDate(finalizedAt)}
            {finalizedBy && ` by ${finalizedBy}`}
          </Text>
        )}
      </View>

      {/* Executive Summary */}
      {salesTotals && (
        <View style={styles.executiveSummary}>
          <Text style={styles.executiveTitle}>Executive Summary</Text>

          <View style={styles.keyMetricRow}>
            <View style={styles.keyMetric}>
              <Text style={styles.keyMetricLabel}>Gross Sales</Text>
              <Text style={styles.keyMetricValue}>{formatCurrency(salesTotals.grossSales)}</Text>
            </View>
            <View style={styles.keyMetric}>
              <Text style={styles.keyMetricLabel}>Cost of Sales</Text>
              <Text style={styles.keyMetricValue}>{formatCurrency(summary.totals.totalCostOfSales)}</Text>
            </View>
            {grossProfit !== null && (
              <View style={styles.keyMetric}>
                <Text style={styles.keyMetricLabel}>Gross Profit</Text>
                <Text style={[styles.keyMetricValue, { color: '#065f46' }]}>{formatCurrency(grossProfit)}</Text>
              </View>
            )}
          </View>

          <View style={styles.keyMetricRow}>
            {foodCostPercentage && (
              <View style={styles.keyMetric}>
                <Text style={styles.keyMetricLabel}>Food Cost %</Text>
                <Text style={[
                  styles.keyMetricValue,
                  { color: parseFloat(foodCostPercentage) < 30 ? '#065f46' : parseFloat(foodCostPercentage) < 35 ? '#92400e' : '#991b1b' }
                ]}>
                  {foodCostPercentage}%
                </Text>
              </View>
            )}
            {grossMargin !== null && (
              <View style={styles.keyMetric}>
                <Text style={styles.keyMetricLabel}>Gross Margin</Text>
                <Text style={[
                  styles.keyMetricValue,
                  { color: grossMargin >= 70 ? '#065f46' : grossMargin >= 60 ? '#92400e' : '#991b1b' }
                ]}>
                  {grossMargin.toFixed(2)}%
                </Text>
              </View>
            )}
            <View style={styles.keyMetric}>
              <Text style={styles.keyMetricLabel}>Net Sales</Text>
              <Text style={styles.keyMetricValue}>{formatCurrency(salesTotals.netSales)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Sales Summary */}
      {sales?.days && salesTotals && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Sales Breakdown</Text>
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
            {WEEK_DAYS.map((day, index) => {
              const dayData = sales.days[day];
              const gross = calculateDayGross(dayData);
              const net = calculateDayNet(dayData);
              return (
                <View key={day} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
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
            <View style={[styles.tableRow, { backgroundColor: '#1f2937' }]}>
              <View style={styles.tableCell}>
                <Text style={[styles.tableHeaderText, { color: '#ffffff' }]}>TOTAL</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={[styles.tableHeaderText, { color: '#ffffff' }]}>{formatCurrency(salesTotals.grossSales)}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={[styles.tableHeaderText, { color: '#ffffff' }]}>{formatCurrency(salesTotals.lessSalesTax)}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={[styles.tableHeaderText, { color: '#ffffff' }]}>{formatCurrency(salesTotals.lessPromo)}</Text>
              </View>
              <View style={styles.tableCellRight}>
                <Text style={[styles.tableHeaderText, { color: '#ffffff' }]}>{formatCurrency(salesTotals.netSales)}</Text>
              </View>
            </View>
          </View>
        </View>
      )}


      {/* Detailed Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredient Cost Breakdown by Category</Text>
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

          {/* Group items by category */}
          {(() => {
            // Group breakdown items by category
            const groupedItems = summary.breakdown.reduce<Record<string, typeof summary.breakdown>>((acc, item) => {
              const category = ingredientCategories?.[item.ingredientId] || 'other';
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(item);
              return acc;
            }, {});

            // Calculate category subtotals
            const categoryTotals = Object.entries(groupedItems).reduce<Record<string, { usage: number; cost: number }>>((acc, [category, items]) => {
              acc[category] = items.reduce(
                (totals, item) => ({
                  usage: totals.usage + item.usage,
                  cost: totals.cost + item.costOfSales
                }),
                { usage: 0, cost: 0 }
              );
              return acc;
            }, {});

            let rowIndex = 0;
            return categoryOrder.map((category) => {
              const items = groupedItems[category];
              if (!items || items.length === 0) return null;

              return (
                <View key={category}>
                  {/* Category Header */}
                  <View style={styles.categoryHeader}>
                    <View style={styles.tableCell}>
                      <Text style={styles.categoryHeaderText}>{categoryLabels[category] || category}</Text>
                    </View>
                  </View>

                  {/* Category Items */}
                  {items.map((item) => {
                    const currentRowIndex = rowIndex++;
                    return (
                      <View key={item.ingredientId} style={currentRowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                        <View style={styles.tableCell}>
                          <Text>  {ingredientNames[item.ingredientId] || item.ingredientId}</Text>
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
                            {sourceVersions[item.ingredientId] || 'N/A'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Category Subtotal */}
                  <View style={[styles.tableRow, { backgroundColor: '#e5e7eb', fontWeight: 'bold' }]}>
                    <View style={styles.tableCell}>
                      <Text style={{ fontWeight: 'bold', fontSize: 10 }}>
                        {categoryLabels[category]} Subtotal
                      </Text>
                    </View>
                    <View style={styles.tableCellRight}>
                      <Text style={{ fontWeight: 'bold', fontSize: 10 }}>
                        {categoryTotals[category].usage.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.tableCellRight}>
                      <Text></Text>
                    </View>
                    <View style={styles.tableCellRight}>
                      <Text style={{ fontWeight: 'bold', fontSize: 10 }}>
                        {formatCurrency(categoryTotals[category].cost)}
                      </Text>
                    </View>
                    <View style={styles.tableCellCenter}>
                      <Text></Text>
                    </View>
                  </View>
                </View>
              );
            });
          })()}

          {/* Grand Total Row */}
          <View style={[styles.tableRow, { backgroundColor: '#1f2937' }]}>
            <View style={styles.tableCell}>
              <Text style={[styles.tableHeaderText, { color: '#ffffff' }]}>GRAND TOTAL</Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text style={[styles.tableHeaderText, { color: '#ffffff' }]}>{summary.totals.totalUsageUnits.toFixed(2)}</Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text></Text>
            </View>
            <View style={styles.tableCellRight}>
              <Text style={[styles.tableHeaderText, { color: '#ffffff' }]}>{formatCurrency(summary.totals.totalCostOfSales)}</Text>
            </View>
            <View style={styles.tableCellCenter}>
              <Text></Text>
            </View>
          </View>
        </View>
      </View>

      {/* Performance Benchmarks */}
      {foodCostPercentage && salesTotals && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Benchmarks</Text>
          <View style={{ padding: 16, backgroundColor: '#f9fafb', border: '1.5px solid #d1d5db', borderRadius: 6 }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, marginBottom: 8, color: '#374151', fontWeight: 'bold' }}>
                Food Cost Percentage Analysis
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Text style={{ fontSize: 10, color: '#6b7280' }}>Formula:</Text>
                <Text style={{ fontSize: 10, color: '#374151' }}>
                  {formatCurrency(summary.totals.totalCostOfSales)} ÷ {formatCurrency(salesTotals.grossSales)} =
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: parseFloat(foodCostPercentage) < 30 ? '#065f46' : parseFloat(foodCostPercentage) < 35 ? '#92400e' : '#991b1b'
                }}>
                  {foodCostPercentage}%
                </Text>
              </View>
            </View>

            <View style={{ borderTop: '1px solid #d1d5db', paddingTop: 10 }}>
              <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 4 }}>Industry Benchmarks:</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.badge, styles.badgeGreen]}>
                  <Text style={{ fontSize: 8 }}>Excellent: &lt;30%</Text>
                </View>
                <View style={[styles.badge, styles.badgeYellow]}>
                  <Text style={{ fontSize: 8 }}>Acceptable: 30-35%</Text>
                </View>
                <View style={[styles.badge, styles.badgeRed]}>
                  <Text style={{ fontSize: 8 }}>Needs Attention: &gt;35%</Text>
                </View>
              </View>
            </View>

            {grossMargin !== null && (
              <View style={{ borderTop: '1px solid #d1d5db', paddingTop: 10, marginTop: 10 }}>
                <Text style={{ fontSize: 11, marginBottom: 6, color: '#374151', fontWeight: 'bold' }}>
                  Gross Margin Analysis
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.badge, grossMargin >= 70 ? styles.badgeGreen : grossMargin >= 60 ? styles.badgeYellow : styles.badgeRed]}>
                    <Text style={{ fontSize: 8 }}>Current: {grossMargin.toFixed(2)}%</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: '#6b7280', alignSelf: 'center' }}>
                    Target: ≥70% (excellent) | ≥60% (acceptable)
                  </Text>
                </View>
              </View>
            )}
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