import { useState } from 'react';
import type {
  ThemeName,
  TableDensity,
  CurrencySymbol,
  DecimalPrecision,
  ThousandsSeparator,
  AppStartPage,
} from '@domain/costing';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { usePreferences } from '../../providers/preferences-provider';
import { useAuthContext } from '../../providers/auth-provider';
import { THEME_OPTIONS, THEMES } from '../../../constants/themes';

export const UserSettingsPage = () => {
  const { user, profile } = useAuthContext();
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleThemeChange = async (theme: ThemeName) => {
    try {
      await updatePreferences({ theme });
      setSaveMessage({ type: 'success', message: 'Theme updated' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', message: 'Failed to update theme' });
    }
  };

  const handleDensityChange = async (density: TableDensity) => {
    try {
      await updatePreferences({ tableDensity: density });
      setSaveMessage({ type: 'success', message: 'Table density updated' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', message: 'Failed to update density' });
    }
  };

  const handleNumberFormatChange = async (
    field: 'currency' | 'decimals' | 'thousandsSeparator',
    value: CurrencySymbol | DecimalPrecision | ThousandsSeparator
  ) => {
    try {
      await updatePreferences({
        numberFormat: {
          ...preferences.numberFormat,
          [field]: value,
        },
      });
      setSaveMessage({ type: 'success', message: 'Number format updated' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', message: 'Failed to update number format' });
    }
  };

  const handleStartPageChange = async (startPage: AppStartPage) => {
    try {
      await updatePreferences({ defaultStartPage: startPage });
      setSaveMessage({ type: 'success', message: 'Start page updated' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', message: 'Failed to update start page' });
    }
  };

  const handleNotificationChange = async (
    field: 'foodCostWarningThreshold' | 'successToastDuration',
    value: number
  ) => {
    try {
      await updatePreferences({
        notifications: {
          ...preferences.notifications,
          [field]: value,
        },
      });
      setSaveMessage({ type: 'success', message: 'Notification settings updated' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', message: 'Failed to update notifications' });
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all preferences to defaults?')) {
      try {
        await resetPreferences();
        setSaveMessage({ type: 'success', message: 'Preferences reset to defaults' });
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (error) {
        setSaveMessage({ type: 'error', message: 'Failed to reset preferences' });
      }
    }
  };

  // Format currency example
  const formatExample = (value: number) => {
    const { currency, decimals, thousandsSeparator } = preferences.numberFormat;
    const separatorChar =
      thousandsSeparator === 'comma'
        ? ','
        : thousandsSeparator === 'period'
          ? '.'
          : thousandsSeparator === 'space'
            ? ' '
            : '';

    const parts = value.toFixed(decimals).split('.');
    if (separatorChar) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separatorChar);
    }

    return `${currency}${parts.join('.')}`;
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Customize your Electric Abacus experience with themes, formatting, and preferences.
        </p>
      </header>

      {saveMessage && (
        <div
          className={
            saveMessage.type === 'success'
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
              : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
          }
        >
          {saveMessage.message}
        </div>
      )}

      {/* User Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700">Name</Label>
            <p className="text-sm text-slate-900 mt-1">{profile?.displayName || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Email</Label>
            <p className="text-sm text-slate-900 mt-1">{user?.email || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Role</Label>
            <p className="text-sm text-slate-900 mt-1 capitalize">{profile?.role || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose a color theme for your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEME_OPTIONS.map((option) => {
              const theme = THEMES[option.value];
              const isSelected = preferences.theme === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value)}
                  className={`relative rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50 ${
                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {/* Color swatches */}
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                      />
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: `hsl(${theme.colors.secondary})` }}
                      />
                      <div
                        className="w-8 h-8 rounded"
                        style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
                      />
                    </div>
                    <h3 className="font-semibold text-slate-900">{option.label}</h3>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Table Density */}
      <Card>
        <CardHeader>
          <CardTitle>Table Density</CardTitle>
          <CardDescription>
            Adjust spacing in data tables for comfort or information density
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['compact', 'comfortable', 'spacious'] as TableDensity[]).map((density) => (
              <button
                key={density}
                onClick={() => handleDensityChange(density)}
                className={`rounded-lg border-2 p-4 text-center transition-all capitalize hover:border-primary/50 ${
                  preferences.tableDensity === density
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200'
                }`}
              >
                {density}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Current: <span className="font-medium capitalize">{preferences.tableDensity}</span>
          </p>
        </CardContent>
      </Card>

      {/* Number Formatting */}
      <Card>
        <CardHeader>
          <CardTitle>Number Formatting</CardTitle>
          <CardDescription>Customize how currency and numbers are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency Symbol</Label>
              <Select
                id="currency"
                value={preferences.numberFormat.currency}
                onChange={(e) =>
                  handleNumberFormatChange('currency', e.target.value as CurrencySymbol)
                }
              >
                <option value="$">$ (Dollar)</option>
                <option value="£">£ (Pound)</option>
                <option value="€">€ (Euro)</option>
                <option value="¥">¥ (Yen)</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decimals">Decimal Places</Label>
              <Select
                id="decimals"
                value={preferences.numberFormat.decimals}
                onChange={(e) =>
                  handleNumberFormatChange('decimals', Number(e.target.value) as DecimalPrecision)
                }
              >
                <option value="0">0 (Whole numbers)</option>
                <option value="1">1 decimal place</option>
                <option value="2">2 decimal places</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="separator">Thousands Separator</Label>
              <Select
                id="separator"
                value={preferences.numberFormat.thousandsSeparator}
                onChange={(e) =>
                  handleNumberFormatChange('thousandsSeparator', e.target.value as ThousandsSeparator)
                }
              >
                <option value="comma">Comma (1,000)</option>
                <option value="period">Period (1.000)</option>
                <option value="space">Space (1 000)</option>
                <option value="none">None (1000)</option>
              </Select>
            </div>
          </div>

          <div className="rounded-md bg-slate-50 p-3 border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Example:</p>
            <p className="text-lg font-mono font-semibold text-slate-900">{formatExample(12345.67)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Default Start Page */}
      <Card>
        <CardHeader>
          <CardTitle>Default Start Page</CardTitle>
          <CardDescription>Choose which page loads when you sign in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startPage">Start Page</Label>
            <Select
              id="startPage"
              value={preferences.defaultStartPage}
              onChange={(e) => handleStartPageChange(e.target.value as AppStartPage)}
            >
              <option value="/app/weeks">Weeks List</option>
              <option value="/app/weeks/current">Current Week</option>
              <option value="/app/menu-items">Menu Items</option>
              <option value="/app/ingredients">Ingredients</option>
              <option value="/app/review">Week Review</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications & Alerts</CardTitle>
          <CardDescription>Control when and how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="foodCostThreshold">
              Food Cost Warning Threshold (%)
            </Label>
            <Input
              id="foodCostThreshold"
              type="number"
              min="0"
              max="100"
              step="1"
              value={preferences.notifications.foodCostWarningThreshold}
              onChange={(e) =>
                handleNotificationChange('foodCostWarningThreshold', Number(e.target.value))
              }
            />
            <p className="text-xs text-slate-500">
              Show warnings when food cost percentage exceeds this threshold (current:{' '}
              {preferences.notifications.foodCostWarningThreshold}%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="toastDuration">Success Message Duration (seconds)</Label>
            <Input
              id="toastDuration"
              type="number"
              min="1"
              max="10"
              step="1"
              value={preferences.notifications.successToastDuration / 1000}
              onChange={(e) =>
                handleNotificationChange('successToastDuration', Number(e.target.value) * 1000)
              }
            />
            <p className="text-xs text-slate-500">
              How long success messages display before auto-dismissing (current:{' '}
              {preferences.notifications.successToastDuration / 1000}s)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reset Section */}
      <Card className="border-slate-300">
        <CardHeader>
          <CardTitle>Reset Preferences</CardTitle>
          <CardDescription>Restore all settings to their default values</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleReset} className="text-destructive border-destructive/30 hover:bg-destructive/10">
            Reset All Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
