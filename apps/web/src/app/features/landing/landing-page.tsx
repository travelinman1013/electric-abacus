import { Link } from 'react-router-dom';
import { Calculator, TrendingUp, FileText, Users, Shield, Zap } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-slate-900">Electric Abacus</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-5xl font-bold text-slate-900 leading-tight">
            Streamline Your Operations.
            <br />
            <span className="text-primary">Maximize Your Profits.</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            Electric Abacus is a powerful operations management tool built for restaurants, cafés,
            and food service businesses. Track inventory, manage costs, and optimize your menu—all
            in one place.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Everything You Need to Run Your Business
          </h2>
          <p className="text-lg text-slate-600">
            Powerful features designed for food service operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Real-Time Cost Tracking</h3>
                  <p className="text-slate-600 text-sm">
                    Monitor ingredient costs, recipe profitability, and food cost percentages in
                    real-time with automatic calculations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Weekly Operations Management</h3>
                  <p className="text-slate-600 text-sm">
                    Track sales, inventory, and usage on a weekly basis. Finalize weeks and
                    generate comprehensive PDF reports.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Recipe Costing</h3>
                  <p className="text-slate-600 text-sm">
                    Calculate exact recipe costs with automatic unit conversions and batch
                    ingredient support. Optimize menu pricing effortlessly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Team Collaboration</h3>
                  <p className="text-slate-600 text-sm">
                    Role-based access control lets you manage who can view and edit sensitive data.
                    Perfect for multi-user teams.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Secure & Reliable</h3>
                  <p className="text-slate-600 text-sm">
                    Built on Firebase and Google Cloud Platform with enterprise-grade security and
                    99.9% uptime SLA.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
                  <p className="text-slate-600 text-sm">
                    Modern architecture built with React and TypeScript delivers instant updates and
                    a responsive user experience.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Why Choose Electric Abacus?</h2>
            <p className="text-lg text-slate-300">
              Join hundreds of restaurants optimizing their operations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">15min</div>
              <div className="text-lg font-medium mb-2">Weekly Setup</div>
              <p className="text-slate-400 text-sm">
                Our streamlined workflow means you can complete your weekly operations tracking in
                just 15 minutes.
              </p>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">30%</div>
              <div className="text-lg font-medium mb-2">Cost Savings</div>
              <p className="text-slate-400 text-sm">
                Users report an average of 30% reduction in food waste through better inventory
                tracking and cost analysis.
              </p>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-lg font-medium mb-2">Access Anywhere</div>
              <p className="text-slate-400 text-sm">
                Cloud-based platform means you can access your data from any device, any time, from
                anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <h2 className="text-4xl font-bold text-slate-900">Ready to Get Started?</h2>
          <p className="text-xl text-slate-600">
            Join today and start optimizing your operations. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="font-semibold text-slate-900">Electric Abacus</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <Link to="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <a href="mailto:support@electricabacus.com" className="hover:text-primary transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-slate-500">
              © 2025 Electric Abacus. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
