import { useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  ThemeMode,
  BaseColor,
  TableDensity,
  CurrencySymbol,
  DecimalPrecision,
  ThousandsSeparator,
  AppStartPage,
} from '@domain/preferences';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { NativeSelect as Select } from '../../components/ui/native-select';
import { Input } from '../../components/ui/input';
import { usePreferences } from '../../providers/preferences-provider';
import { useAuthContext } from '../../providers/auth-provider';

const BASE_COLOR_OPTIONS: Array<{ value: BaseColor; label: string; description: string }> = [
  { value: 'slate', label: 'Slate', description: 'Cool and professional blue-gray tones' },
  { value: 'gray', label: 'Gray', description: 'True neutral gray palette' },
  { value: 'zinc', label: 'Zinc', description: 'Modern and refined cool gray' },
  { value: 'neutral', label: 'Neutral', description: 'Warm neutral tones' },
  { value: 'stone', label: 'Stone', description: 'Earthy and organic brown-gray' },
  { value: 'blue', label: 'Blue', description: 'Ocean and sky inspired tones' },
  { value: 'green', label: 'Green', description: 'Fresh and natural forest tones' },
  { value: 'violet', label: 'Violet', description: 'Rich purple and lavender hues' },
  { value: 'rose', label: 'Rose', description: 'Warm pink and rose tones' },
  { value: 'orange', label: 'Orange', description: 'Energetic and vibrant warm tones' },
];

const MODE_OPTIONS: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export const UserSettingsPage = () => {
  const { user, profile } = useAuthContext();
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showSuccess = (message: string) => {
    setSaveMessage({ type: 'success', message });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const showError = (message: string) => {
    setSaveMessage({ type: 'error', message });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleModeChange = async (mode: ThemeMode) => {
    try {
      await updatePreferences({ mode });
      showSuccess('Theme mode updated');
    } catch (error) {
      showError('Failed to update theme mode');
    }
  };

  const handleBaseColorChange = async (baseColor: BaseColor) => {
    try {
      await updatePreferences({ baseColor });
      showSuccess('Theme color updated');
    } catch (error) {
      showError('Failed to update theme color');
    }
  };

  const handleDensityChange = async (density: TableDensity) => {
    try {
      await updatePreferences({ tableDensity: density });
      showSuccess('Table density updated');
    } catch (error) {
      showError('Failed to update density');
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
      showSuccess('Number format updated');
    } catch (error) {
      showError('Failed to update number format');
    }
  };

  const handleStartPageChange = async (startPage: AppStartPage) => {
    try {
      await updatePreferences({ defaultStartPage: startPage });
      showSuccess('Start page updated');
    } catch (error) {
      showError('Failed to update start page');
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
      showSuccess('Notification settings updated');
    } catch (error) {
      showError('Failed to update notifications');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all preferences to defaults?')) {
      try {
        await resetPreferences();
        showSuccess('Preferences reset to defaults');
      } catch (error) {
        showError('Failed to reset preferences');
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
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Customize your Electric Abacus experience with themes, formatting, and preferences.
        </p>
      </header>

      {saveMessage && (
        <div
          className={
            saveMessage.type === 'success'
              ? 'rounded-md border border-success bg-success/10 px-3 py-2 text-sm text-success-foreground'
              : 'rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive'
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
            <Label className="text-sm font-medium">Name</Label>
            <p className="text-sm mt-1">{profile?.displayName || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm mt-1">{user?.email || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Role</Label>
            <p className="text-sm mt-1 capitalize">{profile?.role || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Terminology - Owner Only */}
      {profile?.role === 'owner' && (
        <Card>
          <CardHeader>
            <CardTitle>Business Terminology</CardTitle>
            <CardDescription>
              Customize the labels used throughout the app to match your business language
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Change how ingredients, menu items, and other business entities are labeled in your
              workspace. For example, change "Ingredients" to "Products" or "Menu Items" to "Dishes".
            </p>
            <Link to="/app/settings/terminology">
              <Button>Manage Terminology</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Theme Selection - shadcn Standard */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Selector (Light/Dark/System) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme Mode</Label>
            <div className="grid grid-cols-3 gap-3">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleModeChange(option.value)}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all hover:border-primary/50 ${
                    preferences.mode === option.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border'
                  }`}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Base Color Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Color Theme</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BASE_COLOR_OPTIONS.map((option) => {
                const isSelected = preferences.baseColor === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleBaseColorChange(option.value)}
                    className={`relative rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50 ${
                      isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
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
                      <h3 className="font-semibold">{option.label}</h3>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
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
                    : 'border-border'
                }`}
              >
                {density}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
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

          <div className="rounded-md bg-muted p-3 border">
            <p className="text-xs text-muted-foreground mb-1">Example:</p>
            <p className="text-lg font-mono font-semibold">{formatExample(12345.67)}</p>
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
            <p className="text-xs text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">
              How long success messages display before auto-dismissing (current:{' '}
              {preferences.notifications.successToastDuration / 1000}s)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reset Section */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Reset Preferences</CardTitle>
          <CardDescription>Restore all settings to their default values</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleReset}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            Reset All Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
