import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';

interface CostBreakdownRow {
  ingredientId: string;
  ingredientName: string;
  usage: number;
  unitCost: number;
  costOfSales: number;
}

interface SummaryPlaceholder {
  totalUsageUnits: number;
  totalCostOfSales: number;
  breakdown: CostBreakdownRow[];
}

const placeholderSummary: SummaryPlaceholder = {
  totalUsageUnits: 182.45,
  totalCostOfSales: 1462.12,
  breakdown: [
    {
      ingredientId: 'seasoned-beef',
      ingredientName: 'Seasoned Beef',
      usage: 102.4,
      unitCost: 6.15,
      costOfSales: 629.76
    },
    {
      ingredientId: 'cheddar-cheese',
      ingredientName: 'Cheddar Cheese',
      usage: 58.1,
      unitCost: 5.8,
      costOfSales: 336.98
    },
    {
      ingredientId: 'flour-tortillas',
      ingredientName: 'Flour Tortillas',
      usage: 21.95,
      unitCost: 2.19,
      costOfSales: 48.07
    }
  ]
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export const WeekReviewPage = () => {
  const { weekId } = useParams<{ weekId: string }>();
  const status: 'draft' | 'finalized' = 'draft';

  const totals = useMemo(() => placeholderSummary, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">{weekId}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-slate-900">Weekly review</h1>
            <Badge variant={status === 'draft' ? 'warning' : 'success'} className="uppercase">
              {status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Verify sales, inventory, and costing before finalizing. Finalization snapshots ingredient costs
            and locks edits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled>
            Export PDF (coming soon)
          </Button>
          <Button disabled={status !== 'draft'}>
            {status === 'draft' ? 'Finalize week' : 'Week finalized'}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total usage units</CardDescription>
            <CardTitle>{totals.totalUsageUnits.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total cost of sales</CardDescription>
            <CardTitle>{formatCurrency(totals.totalCostOfSales)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Variance check</CardDescription>
            <CardTitle>0 issues</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingredient costing snapshot</CardTitle>
          <CardDescription>
            Generated from the inventory usage and ingredient version pricing at the time of finalize.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead className="text-right">Cost of sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.breakdown.map((row) => (
                <TableRow key={row.ingredientId}>
                  <TableCell className="font-medium text-slate-800">{row.ingredientName}</TableCell>
                  <TableCell className="text-right">{row.usage.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.unitCost)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.costOfSales)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="justify-between text-sm text-slate-500">
          <span>Owners can re-run costing before finalizing to refresh ingredient price changes.</span>
          <a
            href="#"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-slate-600 hover:text-slate-900')}
          >
            View raw inventory
          </a>
        </CardFooter>
      </Card>
    </div>
  );
};
