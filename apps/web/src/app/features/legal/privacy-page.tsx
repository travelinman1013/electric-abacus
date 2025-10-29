import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';

export const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="mx-auto max-w-3xl rounded-lg border border bg-card p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: October 17, 2025</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p className="text-foreground leading-relaxed mb-3">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-foreground space-y-1 ml-4">
              <li>Account information (email address, business name, industry, team size)</li>
              <li>Business operational data (inventory, sales, ingredients, recipes)</li>
              <li>Usage data (features used, session duration, error logs)</li>
              <li>Payment information (processed securely through third-party providers)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p className="text-foreground leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-foreground space-y-1 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Security</h2>
            <p className="text-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data, including:
              encryption in transit and at rest, regular security audits, access controls, and
              secure cloud infrastructure powered by Firebase and Google Cloud Platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Sharing and Disclosure</h2>
            <p className="text-foreground leading-relaxed mb-3">
              We do not sell your personal information. We may share your information only in the
              following circumstances:
            </p>
            <ul className="list-disc list-inside text-foreground space-y-1 ml-4">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations or respond to lawful requests</li>
              <li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li>
              <li>In connection with a merger, acquisition, or sale of assets (with prior notice)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p className="text-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to
              provide you services. You may request deletion of your data at any time by contacting
              support. Some data may be retained for legal or backup purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p className="text-foreground leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-foreground space-y-1 ml-4">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Cookies and Tracking</h2>
            <p className="text-foreground leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember your
              preferences, and analyze usage patterns. You can control cookie settings through your
              browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Changes to This Policy</h2>
            <p className="text-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact Us</h2>
            <p className="text-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@electricabacus.com" className="text-primary hover:underline">
                privacy@electricabacus.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border flex justify-between items-center">
          <Link to="/signup">
            <Button variant="outline">Back to Signup</Button>
          </Link>
          <Link to="/terms">
            <Button variant="ghost">View Terms of Service</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
