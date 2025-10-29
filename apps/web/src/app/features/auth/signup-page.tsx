import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { zxcvbn } from 'zxcvbn-typescript';
import type { IndustryType, TeamSizeType } from '@domain/costing';
import {
  signupAccountSchema,
  businessDetailsSchema,
  type SignupAccountInput,
  type BusinessDetailsInput
} from '@domain/costing';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { FormField } from '../../components/forms/FormField';
import { Stepper } from '../../components/ui/stepper';
import { Checkbox } from '../../components/ui/checkbox';
import { Progress } from '../../components/ui/progress';
import { useAuthContext } from '../../providers/auth-provider';
import { Label } from '../../components/ui/label';

const STEPS = ['Account', 'Business', 'Review'];

const INDUSTRY_OPTIONS: { value: IndustryType; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'food-truck', label: 'Food Truck' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'bar', label: 'Bar' },
  { value: 'catering', label: 'Catering' },
  { value: 'other', label: 'Other' }
];

const TEAM_SIZE_OPTIONS: { value: TeamSizeType; label: string }[] = [
  { value: '1-5', label: '1-5 people' },
  { value: '6-10', label: '6-10 people' },
  { value: '11-25', label: '11-25 people' },
  { value: '26-50', label: '26-50 people' },
  { value: '50+', label: '50+ people' }
];

type SignupState = 'idle' | 'creating' | 'provisioning' | 'complete';

export const SignupPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuthContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupState, setSignupState] = useState<SignupState>('idle');

  // Step 1: Account details
  const accountForm = useForm<SignupAccountInput>({
    resolver: zodResolver(signupAccountSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false as true // Allow false during form initialization, validation will ensure it's true on submit
    }
  });

  // Step 2: Business details
  const businessForm = useForm<BusinessDetailsInput>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      name: '',
      industry: 'restaurant',
      teamSize: '1-5'
    }
  });

  // Password strength calculation
  const password = accountForm.watch('password');
  const passwordStrength = password ? zxcvbn(password) : null;
  const strengthScore = passwordStrength?.score ?? 0;
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500'
  ];

  const handleAccountNext = async () => {
    const isValid = await accountForm.trigger();
    if (isValid) {
      setFormError(null);
      setCurrentStep(1);
    }
  };

  const handleBusinessNext = async () => {
    const isValid = await businessForm.trigger();
    if (isValid) {
      setFormError(null);
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setFormError(null);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    setFormError(null);
    setIsSubmitting(true);
    setSignupState('creating');

    try {
      const accountData = accountForm.getValues();
      const businessData = businessForm.getValues();

      // Stage 1: Creating account and business
      setSignupState('creating');
      await signUp(accountData.email, accountData.password, {
        name: businessData.name,
        industry: businessData.industry,
        teamSize: businessData.teamSize
      });

      // Stage 2: Claims have propagated, finalizing
      setSignupState('complete');

      // Let route guards handle navigation automatically
      // Auth state will update and redirect to /app/weeks
    } catch (error) {
      console.error('Signup failed:', error);
      setFormError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setSignupState('idle');
      // Go back to step 0 to allow user to fix issues
      setCurrentStep(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-background to-muted px-2 sm:px-4 py-8">
      <div className="w-full max-w-full sm:max-w-2xl space-y-6 rounded-xl border border bg-card p-4 sm:p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Create Your Account</h1>
          <p className="text-sm text-muted-foreground">
            Get started with Electric Abacus to manage your operations
          </p>
        </div>

        {/* Progress stepper */}
        <Stepper currentStep={currentStep} steps={STEPS} />

        {formError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        {/* Step 1: Account Details */}
        {currentStep === 0 && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAccountNext();
            }}
          >
            <FormField
              label="Email"
              htmlFor="email"
              required
              error={accountForm.formState.errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...accountForm.register('email')}
              />
            </FormField>

            <FormField
              label="Password"
              htmlFor="password"
              required
              error={accountForm.formState.errors.password?.message}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                {...accountForm.register('password')}
              />
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span
                      className={`font-medium ${
                        strengthScore < 2
                          ? 'text-red-600'
                          : strengthScore < 4
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      }`}
                    >
                      {strengthLabels[strengthScore]}
                    </span>
                  </div>
                  <Progress
                    value={(strengthScore / 4) * 100}
                    indicatorClassName={strengthColors[strengthScore]}
                  />
                  {passwordStrength?.feedback.warning && (
                    <p className="text-xs text-amber-600">{passwordStrength.feedback.warning}</p>
                  )}
                </div>
              )}
            </FormField>

            <FormField
              label="Confirm Password"
              htmlFor="confirmPassword"
              required
              error={accountForm.formState.errors.confirmPassword?.message}
            >
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                {...accountForm.register('confirmPassword')}
              />
            </FormField>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={accountForm.watch('termsAccepted')}
                onCheckedChange={(checked) =>
                  accountForm.setValue('termsAccepted', checked as true)
                }
              />
              <Label
                htmlFor="terms"
                className="text-sm leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {accountForm.formState.errors.termsAccepted && (
              <p className="text-sm text-destructive">
                {accountForm.formState.errors.termsAccepted.message}
              </p>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/login')}>
                Back to Login
              </Button>
              <Button type="submit">Next</Button>
            </div>
          </form>
        )}

        {/* Step 2: Business Details */}
        {currentStep === 1 && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void handleBusinessNext();
            }}
          >
            <FormField
              label="Business Name"
              htmlFor="businessName"
              required
              error={businessForm.formState.errors.name?.message}
            >
              <Input
                id="businessName"
                type="text"
                placeholder="My Restaurant"
                {...businessForm.register('name')}
              />
            </FormField>

            <FormField
              label="Industry"
              htmlFor="industry"
              required
              error={businessForm.formState.errors.industry?.message}
            >
              <select
                id="industry"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...businessForm.register('industry')}
              >
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Team Size"
              htmlFor="teamSize"
              required
              error={businessForm.formState.errors.teamSize?.message}
            >
              <select
                id="teamSize"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...businessForm.register('teamSize')}
              >
                {TEAM_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex justify-between gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button type="submit">Next</Button>
            </div>
          </form>
        )}

        {/* Step 3: Review */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="rounded-lg border border bg-muted/50 p-6 space-y-4">
              <h3 className="font-semibold text-lg">Review Your Information</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{accountForm.getValues('email')}</p>
                </div>

                <div className="border-t border pt-3">
                  <p className="text-sm text-muted-foreground">Business Name</p>
                  <p className="font-medium">{businessForm.getValues('name')}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="font-medium">
                    {
                      INDUSTRY_OPTIONS.find((o) => o.value === businessForm.getValues('industry'))
                        ?.label
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Team Size</p>
                  <p className="font-medium">
                    {
                      TEAM_SIZE_OPTIONS.find((o) => o.value === businessForm.getValues('teamSize'))
                        ?.label
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Signup progress feedback */}
            {isSubmitting && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span>
                    {signupState === 'creating' && 'Creating your account...'}
                    {signupState === 'provisioning' && 'Setting up your business...'}
                    {signupState === 'complete' && 'Redirecting to your dashboard...'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Back
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    {signupState === 'creating' && 'Creating Account...'}
                    {signupState === 'provisioning' && 'Setting Up Business...'}
                    {signupState === 'complete' && 'Finalizing...'}
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
};
