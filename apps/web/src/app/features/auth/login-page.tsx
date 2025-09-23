import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuthContext } from '../../providers/auth-provider';

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

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      const redirectPath =
        (location.state as LocationState | undefined)?.from?.pathname ?? '/weeks';
      navigate(redirectPath, { replace: true });
    } catch (error) {
      console.error('Failed to sign in', error);
      setFormError('We could not sign you in. Double-check your email and password.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-slate-100 px-4 py-8">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Taco Casa Digital</h1>
          <p className="text-sm text-slate-500">
            Sign in with the credentials provisioned by your franchise owner.
          </p>
        </div>

        {formError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
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
              placeholder="regan.owner@tacocasa.test"
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
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Demo credentials</p>
          <p>Owner: regan.owner@tacocasa.test</p>
          <p>Team Member: taylor.team@tacocasa.test</p>
        </div>
      </div>
    </div>
  );
};
