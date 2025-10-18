import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuthContext } from '../../providers/auth-provider';
import { debugFirebaseConnection } from '../../utils/debug-firebase';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LocationState {
  from?: Location;
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuthContext();
  const [formError, setFormError] = useState<string | null>(null);
  const [debugTesting, setDebugTesting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    console.log('🚀 Login attempt started', { email: values.email });

    try {
      console.log('🔐 Calling signIn with:', { email: values.email });
      await signIn(values.email, values.password);
      console.log('✅ Sign in successful, redirecting...');

      const redirectPath =
        (location.state as LocationState | undefined)?.from?.pathname ?? '/weeks';
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error('❌ Failed to sign in', error);

      // Extract more specific error information
      const firebaseError = error as { code?: string; message?: string };
      const errorCode = firebaseError.code;
      const errorMessage = firebaseError.message;
      console.error('Error details:', { errorCode, errorMessage, fullError: error });

      // Provide more specific error messages based on Firebase Auth error codes
      let userMessage = 'We could not sign you in. Double-check your email and password.';

      if (errorCode === 'auth/user-not-found') {
        userMessage = 'No account found with this email address.';
      } else if (errorCode === 'auth/wrong-password') {
        userMessage = 'Incorrect password. Please try again.';
      } else if (errorCode === 'auth/invalid-email') {
        userMessage = 'Please enter a valid email address.';
      } else if (errorCode === 'auth/user-disabled') {
        userMessage = 'This account has been disabled. Contact support.';
      } else if (errorCode === 'auth/too-many-requests') {
        userMessage = 'Too many failed attempts. Please try again later.';
      } else if (errorCode === 'auth/network-request-failed') {
        userMessage = 'Network error. Please check your internet connection.';
      }

      setFormError(userMessage);
    }
  };

  const handleDebugTest = async () => {
    setDebugTesting(true);
    setFormError(null);
    console.log('🔧 Running Firebase debug test...');

    try {
      const result = await debugFirebaseConnection();
      if (result.success) {
        console.log('🎉 Debug test successful - Firebase is working!');
        // Auto-fill the form with the test credentials since they work
        form.setValue('email', 'admin@electricabacus.test');
        form.setValue('password', 'AdminPass123!');
      } else {
        console.error('❌ Debug test failed');
        setFormError('Firebase connection test failed. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Debug test error:', error);
      setFormError('Debug test encountered an error. Check console for details.');
    } finally {
      setDebugTesting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-slate-100 px-4 py-8">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Electric Abacus</h1>
          <p className="text-sm text-slate-500">
            Sign in with your account credentials to access your operations dashboard.
          </p>
        </div>

        {formError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} noValidate>
          <FormField
            label="Email"
            htmlFor="email"
            required
            error={form.formState.errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@electricabacus.test"
              {...form.register('email')}
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="password"
            required
            description="Passwords are case sensitive. Contact an owner to reset."
            error={form.formState.errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register('password')}
            />
          </FormField>

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting || debugTesting}
          >
            {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleDebugTest()}
            disabled={form.formState.isSubmitting || debugTesting}
          >
            {debugTesting ? 'Testing Firebase...' : '🔧 Test Firebase Connection'}
          </Button>
        </form>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Demo credentials</p>
          <p>Admin: admin@electricabacus.test</p>
          <p>Staff: staff@electricabacus.test</p>
        </div>

        <div className="text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};
