import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';

export const TermsPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: October 17, 2025</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-700 leading-relaxed">
              By accessing and using Electric Abacus, you accept and agree to be bound by the terms
              and provision of this agreement. If you do not agree to these terms, please do not use
              this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Use License</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Permission is granted to temporarily use Electric Abacus for personal or commercial
              operations management purposes. This license includes:
            </p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>Access to all features included in your subscription tier</li>
              <li>Storage of your business data in our secure cloud infrastructure</li>
              <li>Technical support as outlined in your service agreement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. User Responsibilities</h2>
            <p className="text-slate-700 leading-relaxed mb-3">As a user of Electric Abacus, you agree to:</p>
            <ul className="list-disc list-inside text-slate-700 space-y-1 ml-4">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Not share your account with unauthorized users</li>
              <li>Use the service in compliance with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Data and Privacy</h2>
            <p className="text-slate-700 leading-relaxed">
              Your business data is yours. We store and process your data as outlined in our{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              . We implement industry-standard security measures to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Service Modifications</h2>
            <p className="text-slate-700 leading-relaxed">
              We reserve the right to modify or discontinue the service at any time, with or without
              notice. We will not be liable to you or any third party for any modification,
              suspension, or discontinuance of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Limitation of Liability</h2>
            <p className="text-slate-700 leading-relaxed">
              Electric Abacus is provided "as is" without warranty of any kind. In no event shall we
              be liable for any damages arising out of the use or inability to use the service,
              including but not limited to data loss or business interruption.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Contact Information</h2>
            <p className="text-slate-700 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:support@electricabacus.com" className="text-primary hover:underline">
                support@electricabacus.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
          <Link to="/signup">
            <Button variant="outline">Back to Signup</Button>
          </Link>
          <Link to="/privacy">
            <Button variant="ghost">View Privacy Policy</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
