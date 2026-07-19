import { Link } from "react-router-dom";
import { Percent, Gift, Crown, Truck, Shield, Zap, Star, ArrowRight, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const promos = [
  {
    id: 1,
    title: "Welcome Offer",
    description: "New users get 15% off first order",
    code: "WELCOME15",
    icon: Gift,
    bgClass: "from-emerald-500 via-teal-500 to-cyan-500",
    href: "/register",
  },
  {
    id: 2,
    title: "Super Deals",
    description: "Up to 80% off selected items",
    icon: Percent,
    bgClass: "from-rose-500 via-pink-500 to-fuchsia-500",
    href: "/clearance",
  },
  {
    id: 3,
    title: "Premium Club",
    description: "Free shipping + VIP deals",
    icon: Crown,
    bgClass: "from-amber-500 via-orange-500 to-red-500",
    href: "/premium",
  },
];

const trustBadges = [
  { icon: Truck, title: "Free Shipping", desc: "On orders $25+", gradient: "from-blue-500 to-indigo-600" },
  { icon: Shield, title: "Buyer Protection", desc: "100% secure", gradient: "from-green-500 to-emerald-600" },
  { icon: Zap, title: "Fast Delivery", desc: "2-7 days", gradient: "from-orange-500 to-amber-600" },
  { icon: Star, title: "Top Quality", desc: "5-star rated", gradient: "from-purple-500 to-violet-600" },
];

export function PromoBanners() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Code "${code}" copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <section className="py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      {/* Trust badges - Horizontal scroll on mobile */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
        {trustBadges.map((badge) => (
          <div
            key={badge.title}
            className="flex-shrink-0 w-[140px] sm:w-auto bg-card border rounded-xl p-3 sm:p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                <badge.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-foreground text-xs sm:text-sm truncate">{badge.title}</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{badge.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Promo cards - Stack on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {promos.map((promo) => (
          <Link
            key={promo.id}
            to={promo.href}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${promo.bgClass} p-4 sm:p-5 hover:scale-[1.01] transition-transform duration-200 shadow-lg`}
          >
            {/* Pattern overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgyMHYyMEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-40" />
            
            <div className="relative z-10 flex items-center gap-3 sm:block">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 sm:mb-3 border border-white/20">
                <promo.icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-0.5 sm:mb-1">{promo.title}</h3>
                <p className="text-white/85 text-xs sm:text-sm mb-2 sm:mb-3 truncate">{promo.description}</p>
                {promo.code ? (
                  <button
                    onClick={(e) => copyCode(promo.code!, e)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white font-mono text-sm font-semibold border border-white/20 hover:bg-white/30 transition-colors press-scale"
                  >
                    <span>{promo.code}</span>
                    <Copy className={`h-3.5 w-3.5 ${copiedCode === promo.code ? 'text-green-300' : 'opacity-70'}`} />
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-white text-sm font-medium">
                    Shop Now
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </div>
            </div>
            
            {/* Decorative elements - Hidden on mobile for cleaner look */}
            <div className="hidden sm:block absolute top-1/2 right-2 -translate-y-1/2 w-24 h-24 rounded-full bg-white/10" />
          </Link>
        ))}
      </div>
    </section>
  );
}
