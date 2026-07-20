import { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, Shirt, Home as HomeIcon, Sparkles as SparklesIcon } from "lucide-react";
import type { Product } from "@/components/products/ProductCard";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { titleStyle, subtitleStyle, type TextStyle } from "@/lib/bentoText";

interface HeroBentoProps {
  forYou?: Product[];
  flashSale?: Product[];
  trending?: Product[];
}

interface BentoTileCfg {
  id: string;
  visible: boolean;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  link?: string;
  objectFit?: "cover" | "contain" | "fill";
  focalX?: number;
  focalY?: number;
  overlay?: number;
  bgColor?: string;
  zoom?: number;
  textStyle?: TextStyle;
  badge?: string;
  badgeVisible?: boolean;
  ctaText?: string;
}


interface CustomSection {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  link?: string;
  layout: "full" | "split-left" | "split-right";
  bgColor?: string;
  overlay?: number;
  focalX?: number;
  focalY?: number;
  visible: boolean;
  textStyle?: TextStyle;
}

function imgStyle(t: Partial<BentoTileCfg>): React.CSSProperties {
  return {
    objectFit: (t.objectFit ?? "cover") as any,
    objectPosition: `${t.focalX ?? 50}% ${t.focalY ?? 50}%`,
    transform: `scale(${(t.zoom ?? 100) / 100})`,
    transformOrigin: `${t.focalX ?? 50}% ${t.focalY ?? 50}%`,
  };
}



const CATEGORIES = [
  { id: "cat_tech", name: "Tech", sub: "Gadgets", to: "/categories?c=electronics", bg: "bg-[#f7931e]", icon: Cpu, shadow: "shadow-[#f7931e]/25" },
  { id: "cat_lifestyle", name: "Lifestyle", sub: "Fashion", to: "/categories?c=fashion", bg: "bg-neutral-900", icon: Shirt, shadow: "shadow-black/20" },
  { id: "cat_home", name: "Home", sub: "Living", to: "/categories?c=home", bg: "bg-[#e84393]", icon: HomeIcon, shadow: "shadow-[#e84393]/25" },
  { id: "cat_beauty", name: "Beauty", sub: "Skincare", to: "/categories?c=beauty", bg: "bg-[#6c5ce7]", icon: SparklesIcon, shadow: "shadow-[#6c5ce7]/25" },
];

function useCountdown(hours = 4) {
  const [t, setT] = useState(hours * 3600);
  useEffect(() => {
    const i = setInterval(() => setT((v) => (v > 0 ? v - 1 : hours * 3600)), 1000);
    return () => clearInterval(i);
  }, [hours]);
  const h = String(Math.floor(t / 3600)).padStart(2, "0");
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const s = String(t % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function HeroBentoComponent({ forYou = [], flashSale = [], trending = [] }: HeroBentoProps) {
  const countdown = useCountdown(4);
  const { config } = useSiteConfig<{ tiles?: BentoTileCfg[]; sections?: CustomSection[] }>("home_bento", {});
  const tileMap: Record<string, BentoTileCfg> = {};
  (config?.tiles ?? []).forEach((t) => (tileMap[t.id] = t));
  const customSections = (config?.sections ?? []).filter((s) => s.visible !== false);

  const isVisible = (id: string) => tileMap[id]?.visible !== false;
  const cfg = (id: string): BentoTileCfg => tileMap[id] ?? { id, visible: true };


  const forYouItems = forYou.slice(0, 3);
  const flashItems = flashSale.slice(0, 2);
  const trend = trending[0];

  const heroCfg = cfg("hero");
  const flashCfg = cfg("flash");
  const foryouCfg = cfg("foryou");
  const trendingCfg = cfg("trending");
  const vendorsCfg = cfg("vendors");

  return (
    <div className="w-full font-['Barlow',sans-serif]">
      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[128px] sm:auto-rows-[150px] md:auto-rows-[200px] gap-2.5 sm:gap-3 md:gap-5">
        {/* Hero brand moment */}
        {isVisible("hero") && (
          <Link
            to={heroCfg.link || "/products"}
            className="col-span-2 row-span-2 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden relative group shadow-xl shadow-[#6c5ce7]/25 md:shadow-2xl md:shadow-[#6c5ce7]/30 active:scale-[0.99] transition-transform"
          >
            {heroCfg.imageUrl ? (
              <>
                <img src={heroCfg.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(heroCfg)} />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${Math.max((heroCfg.overlay ?? 50)/100, 0.35)}), transparent)` }} />
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7] via-[#e84393] to-[#ff6b35]" />
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#f7931e]/30 rounded-full blur-3xl" />
              </>
            )}

            <div className="relative z-10 h-full flex flex-col justify-end p-4 sm:p-6 md:p-12 text-white">
              {heroCfg.badgeVisible !== false && (
                <span className="inline-flex w-fit items-center gap-1.5 sm:gap-2 bg-white/15 backdrop-blur px-2.5 py-1 sm:px-3 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.18em] sm:tracking-[0.2em] uppercase mb-2 sm:mb-3 md:mb-6">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white animate-pulse" />
                  {heroCfg.badge || "Darzo Marketplace"}
                </span>
              )}
              <h1
                className="font-['Bebas_Neue'] leading-[0.85] tracking-tight uppercase mb-2 sm:mb-3 md:mb-4"
                style={titleStyle("hero", heroCfg.textStyle)}
              >
                {heroCfg.title || "The New Standard"}
              </h1>
              <p className="font-medium opacity-90 max-w-sm mb-3 sm:mb-4 md:mb-6 line-clamp-2 sm:line-clamp-none" style={subtitleStyle("hero", heroCfg.textStyle)}>
                {heroCfg.subtitle || "Bangladesh's curated multi-vendor destination for the bold."}
              </p>
              {heroCfg.ctaText !== "" && (
                <span className="w-fit bg-white text-[#6c5ce7] px-4 py-2 sm:px-5 sm:py-3 md:px-8 md:py-4 rounded-full font-bold text-[9px] sm:text-[10px] md:text-xs tracking-[0.18em] sm:tracking-[0.2em] uppercase group-hover:scale-105 transition-transform shadow-lg md:shadow-xl">
                  {heroCfg.ctaText || "Explore Darzo"}
                </span>
              )}
            </div>

          </Link>
        )}

        {/* Flash deals */}
        {isVisible("flash") && (
          <Link
            to={flashCfg.link || "/products?filter=flash-sale"}
            className="col-span-2 row-span-1 rounded-[1.25rem] md:rounded-[2rem] bg-card border border-border p-3 sm:p-4 md:p-6 flex items-center justify-between shadow-md md:shadow-xl shadow-black/5 hover:-translate-y-1 active:scale-[0.99] transition-transform overflow-hidden relative"
          >
            {flashCfg.imageUrl && (
              <img src={flashCfg.imageUrl} alt="" className="absolute inset-0 w-full h-full opacity-30" style={imgStyle(flashCfg)} />
            )}

            <div className="flex flex-col min-w-0 relative z-10">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 md:mb-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#e84393] animate-pulse" />
                <span className="text-[#e84393] font-bold text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.2em] tabular-nums">
                  Ends in {countdown}
                </span>
              </div>
              <h2 className="font-['Bebas_Neue'] text-foreground leading-none" style={titleStyle("flash", flashCfg.textStyle)}>
                {flashCfg.title || "Flash Deals"}
              </h2>
              <p className="text-muted-foreground font-bold uppercase tracking-wider sm:tracking-widest mt-0.5 sm:mt-1 line-clamp-1" style={subtitleStyle("flash", flashCfg.textStyle)}>
                {flashCfg.subtitle || "Up to 70% Off"}
              </p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 md:gap-3 shrink-0 relative z-10">
              {flashItems.length > 0
                ? flashItems.map((p, i) => (
                    <div
                      key={p.id}
                      className={`w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-muted rounded-xl sm:rounded-2xl overflow-hidden shadow-md sm:shadow-lg transition-transform ${
                        i === 0 ? "hover:rotate-2" : "-rotate-2 hover:rotate-0 hidden xs:block sm:block"
                      }`}
                    >
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))
                : (
                  <>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#ff6b35] to-[#e84393] rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg" />
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#6c5ce7] to-[#e84393] rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg -rotate-2 hidden sm:block" />
                  </>
                )}
            </div>
          </Link>
        )}

        {/* Category tiles */}
        {CATEGORIES.filter((c) => isVisible(c.id)).map(({ id, name, sub, to, bg, icon: Icon, shadow }) => {
          const c = cfg(id);
          return (
            <Link
              key={id}
              to={c.link || to}
              className={`col-span-1 row-span-1 rounded-[1.75rem] md:rounded-[2rem] ${c.imageUrl ? "" : bg} p-4 md:p-6 text-white flex flex-col justify-between shadow-lg ${shadow} group cursor-pointer overflow-hidden relative hover:-translate-y-1 transition-transform`}
            >
              {c.imageUrl && (
                <>
                  <img src={c.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(c)} />
                  <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(c.overlay ?? 40)/100})` }} />
                </>
              )}

              <div className="relative z-10">
                <div className="h-9 w-9 md:h-10 md:w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mb-3 md:mb-4">
                  <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <h3 className="font-['Bebas_Neue'] leading-none tracking-wide" style={titleStyle("category", c.textStyle)}>
                  {c.title || name}<br /><span style={subtitleStyle("category", c.textStyle)}>{c.subtitle || sub}</span>
                </h3>
              </div>
              {!c.imageUrl && (
                <div className="absolute -bottom-4 -right-4 opacity-15 group-hover:scale-110 transition-transform">
                  <Icon className="w-20 h-20 md:w-24 md:h-24" />
                </div>
              )}
            </Link>
          );
        })}

        {/* For You */}
        {isVisible("foryou") && (
          <div className="col-span-2 md:col-span-1 row-span-2 rounded-[2rem] md:rounded-[2.5rem] bg-card border border-border p-5 md:p-8 shadow-xl shadow-black/5">
            <h3 className="font-['Bebas_Neue'] text-foreground mb-4 md:mb-6" style={titleStyle("foryou", foryouCfg.textStyle)}>
              {foryouCfg.title || "For You"}
            </h3>
            <div className="space-y-4 md:space-y-6">
              {forYouItems.length > 0 ? (
                forYouItems.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.slug}`}
                    className="flex items-center gap-3 md:gap-4 group"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-muted rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-bold text-foreground line-clamp-1 group-hover:text-[#6c5ce7]">
                        {p.name}
                      </p>
                      <p className="text-[11px] md:text-xs text-muted-foreground font-bold">
                        ৳ {p.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                [1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-muted rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-2.5 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link
              to={foryouCfg.link || "/products"}
              className="mt-6 md:mt-8 w-full border border-border py-2.5 md:py-3 rounded-2xl text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] hover:bg-muted transition-colors flex items-center justify-center"
            >
              {foryouCfg.subtitle || "Personalize Feed"}
            </Link>
          </div>
        )}

        {/* Trending product */}
        {isVisible("trending") && (
          <Link
            to={trendingCfg.link || (trend ? `/product/${trend.slug}` : "/products?sort=trending")}
            className="col-span-2 md:col-span-1 row-span-2 rounded-[2rem] md:rounded-[2.5rem] bg-neutral-200 overflow-hidden relative group shadow-lg"
          >
            {trendingCfg.imageUrl ? (
              <img src={trendingCfg.imageUrl} alt="" className="w-full h-full group-hover:scale-110 transition-transform duration-1000" style={imgStyle(trendingCfg)} loading="lazy" />
            ) : trend ? (
              <img src={trend.image} alt={trend.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#ff6b35] via-[#e84393] to-[#6c5ce7]" />
            )}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${Math.max((trendingCfg.overlay ?? 60)/100, 0.4)}), transparent)` }} />

            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 text-white">
              <span className="font-bold bg-[#ff6b35] px-3 py-1 rounded-full uppercase tracking-widest" style={subtitleStyle("trending", trendingCfg.textStyle)}>
                {trendingCfg.subtitle || "Trending"}
              </span>
              <h3 className="font-['Bebas_Neue'] mt-2 md:mt-3 leading-none tracking-wider line-clamp-2" style={titleStyle("trending", trendingCfg.textStyle)}>
                {trendingCfg.title || trend?.name || "Capture Purity"}
              </h3>
              {trend && !trendingCfg.title && (
                <p className="text-base md:text-lg font-bold mt-1.5 md:mt-2 text-[#f7931e]">
                  ৳ {trend.price.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </Link>
        )}

        {/* Marketplace trust */}
        {isVisible("vendors") && (
          <div className="col-span-2 row-span-1 rounded-[2rem] md:rounded-[2.5rem] bg-muted/50 border border-border p-5 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-8 justify-between overflow-hidden relative">
            {vendorsCfg.imageUrl && (
              <img src={vendorsCfg.imageUrl} alt="" className="absolute inset-0 w-full h-full opacity-40" style={imgStyle(vendorsCfg)} />
            )}

            <div className="flex flex-col text-center md:text-left relative z-10">
              <h4 className="font-['Bebas_Neue'] text-foreground leading-none mb-1.5 md:mb-2" style={titleStyle("vendors", vendorsCfg.textStyle)}>
                {vendorsCfg.title || "Multi-Vendor Power"}
              </h4>
              <p className="text-muted-foreground font-medium" style={subtitleStyle("vendors", vendorsCfg.textStyle)}>
                {vendorsCfg.subtitle || "Supporting 1,200+ local artisans and premium global brands across Bangladesh."}
              </p>
            </div>
            <div className="flex -space-x-3 md:-space-x-4 shrink-0 relative z-10">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-background bg-card shadow-sm flex items-center justify-center font-bold text-muted-foreground italic">D</div>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-background bg-[#6c5ce7] shadow-sm flex items-center justify-center font-bold text-white">Z</div>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-4 border-background bg-[#e84393] shadow-sm flex items-center justify-center font-bold text-white italic">A</div>
            </div>
          </div>
        )}
      </div>

      {/* Admin-defined custom sections */}
      {customSections.length > 0 && (
        <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
          {customSections.map((s) => {
            const inner = (
              <div className="relative w-full overflow-hidden rounded-[1.75rem] md:rounded-[2.5rem] shadow-lg" style={{ minHeight: 180 }}>
                {s.imageUrl
                  ? <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={imgStyle(s)} />
                  : <div className="absolute inset-0" style={{ background: s.bgColor || "linear-gradient(135deg,#6c5ce7,#e84393)" }} />}
                <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(s.overlay ?? 40)/100})` }} />
                <div className="relative z-10 p-6 md:p-10 text-white min-h-[180px] md:min-h-[240px] flex flex-col justify-center">
                  <h3 className="font-['Bebas_Neue'] leading-none" style={titleStyle("section", s.textStyle)}>{s.title}</h3>
                  {s.subtitle && <p className="mt-2 opacity-90 max-w-xl" style={subtitleStyle("section", s.textStyle)}>{s.subtitle}</p>}
                </div>
              </div>
            );
            return s.link
              ? <Link key={s.id} to={s.link} className="block hover:-translate-y-1 transition-transform">{inner}</Link>
              : <div key={s.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}


export const HeroBento = memo(HeroBentoComponent);
