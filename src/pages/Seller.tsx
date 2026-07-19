import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Store, TrendingUp, Globe, Package, Shield, Headphones, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: Globe, title: "Global Reach", desc: "Sell to 50M+ customers in 200+ countries" },
  { icon: TrendingUp, title: "Growth Tools", desc: "Analytics and marketing tools to boost sales" },
  { icon: Package, title: "Easy Fulfillment", desc: "Flexible shipping and logistics solutions" },
  { icon: Shield, title: "Seller Protection", desc: "Secure payments and fraud prevention" },
  { icon: Headphones, title: "24/7 Support", desc: "Dedicated seller support team" },
];

const steps = [
  { step: 1, title: "Create Account", desc: "Sign up for a free seller account" },
  { step: 2, title: "List Products", desc: "Add your products with photos and details" },
  { step: 3, title: "Start Selling", desc: "Reach millions of buyers worldwide" },
];

export default function Seller() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSellerStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const { data: seller } = await supabase
          .from("sellers")
          .select("status")
          .eq("user_id", user.id)
          .single();

        if (seller) {
          if (seller.status === "approved") {
            navigate("/seller/dashboard", { replace: true });
            return;
          } else if (seller.status === "pending") {
            navigate("/seller/pending", { replace: true });
            return;
          }
        }
      } catch {
        // No seller record found - show marketing page
      }
      setChecking(false);
    };

    checkSellerStatus();
  }, [user, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-primary to-orange-500 text-white py-20">
          <div className="container">
            <div className="max-w-2xl">
              <Store className="h-16 w-16 mb-4" />
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Sell on MegaMart</h1>
              <p className="text-xl opacity-90 mb-8">Join 100,000+ sellers and reach millions of customers worldwide</p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
                  <Link to={user ? "/seller/register" : "/register"}>
                    Start Selling Today
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="container -mt-10 relative z-10">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border rounded-xl p-6 text-center shadow-lg">
              <p className="text-3xl font-bold text-primary">50M+</p>
              <p className="text-muted-foreground">Active Buyers</p>
            </div>
            <div className="bg-card border rounded-xl p-6 text-center shadow-lg">
              <p className="text-3xl font-bold text-primary">200+</p>
              <p className="text-muted-foreground">Countries</p>
            </div>
            <div className="bg-card border rounded-xl p-6 text-center shadow-lg">
              <p className="text-3xl font-bold text-primary">$0</p>
              <p className="text-muted-foreground">Setup Fee</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="container py-16">
          <h2 className="text-2xl font-bold text-center mb-8">Why Sell on MegaMart?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="p-6 bg-card border rounded-xl">
                <b.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{b.title}</h3>
                <p className="text-muted-foreground text-sm">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How to start */}
        <div className="bg-muted py-16">
          <div className="container">
            <h2 className="text-2xl font-bold text-center mb-8">Get Started in 3 Easy Steps</h2>
            <div className="flex flex-col md:flex-row gap-6 max-w-4xl mx-auto">
              {steps.map((s) => (
                <div key={s.step} className="flex-1 p-6 bg-card border rounded-xl text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    {s.step}
                  </div>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to grow your business?</h2>
          <p className="text-muted-foreground mb-6">Join thousands of successful sellers on MegaMart</p>
          <Button size="lg" asChild>
            <Link to={user ? "/seller/register" : "/register"}>
              Create Seller Account <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
