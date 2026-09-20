import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function PageHero({
  bgImage,
  backgroundImage,
  title,
  subtitle,
  description,
  breadcrumbs = [],
  breadcrumb = [],
  crumbs = [],
  actions = null,
}) {
  const image = bgImage || backgroundImage;
  const sub = subtitle || description;
  const trail = breadcrumbs.length > 0 ? breadcrumbs : (breadcrumb.length > 0 ? breadcrumb : crumbs);

  return (
    <section className="relative w-full overflow-hidden border-b border-slate-800/80 bg-[#0c0e22] text-white">
      {/* Background Image: Subtle, clean, visible in both modes with no tint, fog, or blur */}
      {image && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover object-center"
          />
          {/* Dark transparent overlay strictly for readability */}
          <div className="absolute inset-0 bg-[#0c0e22]/75" />
        </div>
      )}

      {/* Hero Content Container: Fixed white text across light and dark modes */}
      <div className="container-x relative z-10 py-14 sm:py-18 lg:py-22 text-on-image">
        {/* Optional Breadcrumb Navigation */}
        {trail && trail.length > 0 && (
          <nav aria-label="Breadcrumb" className="hero-disclaimer flex items-center gap-2 text-xs font-semibold mb-5 tracking-wide flex-wrap text-white/80">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            {trail.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-white/60 shrink-0" />
                {item.to ? (
                  <Link to={item.to} className="hover:text-white transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-white font-bold">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="max-w-4xl">
          <h1 className="hero-title text-3xl sm:text-4xl md:text-5xl font-extrabold font-display leading-[1.15] tracking-tight text-white">
            {title}
          </h1>

          {sub && (
            <p className="hero-description mt-4 text-base sm:text-lg max-w-3xl leading-relaxed font-normal text-white/90">
              {sub}
            </p>
          )}

          {/* Optional Actions */}
          {actions && (
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export { PageHero, PageHero as PageBackground };
