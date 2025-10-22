import { z } from 'zod';

/**
 * Validation schema for business details during signup
 */
export const businessDetailsSchema = z.object({
  name: z
    .string()
    .min(1, 'Business name is required')
    .max(100, 'Business name must be 100 characters or less')
    .trim(),
  industry: z.enum(
    ['restaurant', 'cafe', 'food-truck', 'bakery', 'bar', 'catering', 'other'],
    {
      errorMap: () => ({ message: 'Please select a valid industry' })
    }
  ),
  teamSize: z.enum(['1-5', '6-10', '11-25', '26-50', '50+'], {
    errorMap: () => ({ message: 'Please select a valid team size' })
  })
});

export type BusinessDetailsInput = z.infer<typeof businessDetailsSchema>;

/**
 * Validation schema for user signup (account details step)
 */
export const signupAccountSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' })
    })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export type SignupAccountInput = z.infer<typeof signupAccountSchema>;
