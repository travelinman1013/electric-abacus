import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { useTerminology } from '../../../hooks/use-terminology';

interface InventoryPieChartProps {
  data: {
    food: number;
    paper: number;
    other: number;
  };
  totalValue: number;
}

const COLORS = {
  food: '#f97316', // Orange
  paper: '#3b82f6', // Blue
  other: '#8b5cf6' // Purple
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercentage = (value: number, total: number) => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

export const InventoryPieChart = ({ data, totalValue }: InventoryPieChartProps) => {
  const { terms } = useTerminology();

  const chartData = [
    { name: 'Food', value: data.food, color: COLORS.food },
    { name: 'Paper', value: data.paper, color: COLORS.paper },
    { name: 'Other', value: data.other, color: COLORS.other }
  ].filter((item) => item.value > 0); // Only show categories with value

  if (totalValue === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{terms.inventory} by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-md border border-dashed bg-muted text-sm text-muted-foreground">
            No {terms.inventory.toLowerCase()} data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{terms.inventory} by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pie Chart */}
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={(props) => {
                  const { name, percent } = props as unknown as { name: string; percent: number };
                  return `${name} ${(percent * 100).toFixed(0)}%`;
                }}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as { name: string; value: number; color: string };
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-lg">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.value)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(item.value, totalValue)} of total
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend with Values */}
          <div className="space-y-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(item.value)}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatPercentage(item.value, totalValue)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-sm font-bold text-foreground">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
