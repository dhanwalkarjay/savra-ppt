'use client';

// SlidePreview — renders actual visual slide thumbnails
// Each card is a miniature version of what the real PPTX slide looks like
// Matches Savra's sample: dark/light alternating, colored headers, image placeholders

interface Slide {
  title: string;
  bullets: string[];
  notes: string;
  layout: string;
}

interface Props {
  slides: Slide[];
  theme: string;
}

// Per-slide background cycling — matches Savra's varied slide backgrounds
const SLIDE_THEMES = [
  { bg: '#0D1B2A', titleColor: '#00BFFF', bodyColor: '#C8D6E5', cardBg: '#1A2940', accent: '#FF4B6E', isDark: true },   // dark navy
  { bg: '#F8F9FA', titleColor: '#1A56DB', bodyColor: '#374151', cardBg: '#FFFFFF', accent: '#1A56DB', isDark: false },  // light clean
  { bg: '#0D1B2A', titleColor: '#00C9A7', bodyColor: '#C8D6E5', cardBg: '#1A2940', accent: '#00C9A7', isDark: true },   // dark teal
  { bg: '#F0F4FF', titleColor: '#1E3A5F', bodyColor: '#374151', cardBg: '#FFFFFF', accent: '#3B82F6', isDark: false },  // light blue
  { bg: '#7C3AED', titleColor: '#FFFFFF', bodyColor: '#EDE9FE', cardBg: '#6D28D9', accent: '#A78BFA', isDark: true },   // purple (like Savra's molecules slide)
  { bg: '#1B4332', titleColor: '#6EE7B7', bodyColor: '#D1FAE5', cardBg: '#2D6A4F', accent: '#00C9A7', isDark: true },   // forest green
  { bg: '#0D1B2A', titleColor: '#FF4B6E', bodyColor: '#C8D6E5', cardBg: '#1A2940', accent: '#FF4B6E', isDark: true },   // dark red accent
  { bg: '#FFFFFF', titleColor: '#1E3A5F', bodyColor: '#374151', cardBg: '#F8F9FA', accent: '#7C3AED', isDark: false },  // white clean
];

const LAYOUT_BADGES: Record<string, { label: string; color: string }> = {
  title: { label: 'Title', color: '#7C3AED' },
  bullets: { label: 'Content', color: '#1A56DB' },
  two_col: { label: '2-Col', color: '#0891B2' },
  summary: { label: 'Summary', color: '#059669' },
};

// Renders a miniature slide that looks like the actual PPTX output
function SlideThumbnail({ slide, index }: { slide: Slide; index: number }) {
  const st = SLIDE_THEMES[index % SLIDE_THEMES.length];
  const badge = LAYOUT_BADGES[slide.layout] || LAYOUT_BADGES.bullets;
  const isTitle = slide.layout === 'title';
  const isSummary = slide.layout === 'summary';
  const isTwoCol = slide.layout === 'two_col';

  return (
    <div className="group relative rounded-xl overflow-hidden border border-white/10 shadow-lg
                    hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 cursor-default"
         style={{ aspectRatio: '16/9', backgroundColor: st.bg }}>

      {/* Slide number */}
      <div className="absolute top-2 left-2 z-10">
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded"
              style={{ backgroundColor: st.cardBg, color: st.bodyColor, opacity: 0.8 }}>
          {index + 1}
        </span>
      </div>

      {/* Layout badge */}
      <div className="absolute top-2 right-2 z-10">
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: badge.color + '22', color: badge.color, border: `1px solid ${badge.color}44` }}>
          {badge.label}
        </span>
      </div>

      {/* ── TITLE SLIDE LAYOUT ── */}
      {isTitle && (
        <div className="absolute inset-0 flex flex-col justify-center px-4">
          {/* Decorative circle */}
          <div className="absolute right-0 top-0 w-24 h-24 rounded-full opacity-20"
               style={{ backgroundColor: st.accent, transform: 'translate(30%, -30%)' }} />
          {/* Accent bar */}
          <div className="w-10 h-0.5 mb-2 rounded-full" style={{ backgroundColor: st.accent }} />
          <h3 className="font-black text-xs leading-tight mb-1.5 uppercase tracking-wide"
              style={{ color: st.titleColor }}>
            {slide.title}
          </h3>
          {slide.bullets[0] && (
            <p className="text-[8px] leading-relaxed" style={{ color: st.bodyColor, opacity: 0.8 }}>
              {slide.bullets[0]}
            </p>
          )}
          {/* Bottom label */}
          <div className="absolute bottom-2 left-4 right-4 py-1 px-2 rounded text-center"
               style={{ backgroundColor: st.cardBg, border: `1px solid ${st.accent}33` }}>
            <span className="text-[7px] font-semibold" style={{ color: st.bodyColor }}>
              {slide.notes?.slice(0, 40) || 'Curriculum aligned · CBSE/NCERT'}
            </span>
          </div>
        </div>
      )}

      {/* ── SUMMARY SLIDE LAYOUT ── */}
      {isSummary && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3">
          {/* Background circle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 rounded-full opacity-20" style={{ backgroundColor: st.cardBg }} />
          </div>
          <p className="text-[7px] font-bold tracking-widest uppercase mb-1" style={{ color: st.accent }}>
            KEY TAKEAWAYS
          </p>
          <h3 className="font-black text-xs text-center leading-tight mb-2 uppercase"
              style={{ color: st.titleColor }}>
            {slide.title}
          </h3>
          <div className="w-full rounded-lg p-2" style={{ backgroundColor: st.cardBg, border: `1px solid ${st.accent}55` }}>
            {slide.bullets.slice(0, 3).map((b, i) => (
              <div key={i} className="flex gap-1 mb-0.5">
                <span className="text-[7px] mt-0.5 flex-shrink-0" style={{ color: st.accent }}>•</span>
                <span className="text-[7px] leading-snug" style={{ color: st.bodyColor }}>{b}</span>
              </div>
            ))}
          </div>
          {/* Bottom pink bar */}
          <div className="absolute bottom-2 w-8 h-0.5 rounded-full" style={{ backgroundColor: '#FF4B6E' }} />
        </div>
      )}

      {/* ── TWO COLUMN LAYOUT ── */}
      {isTwoCol && (
        <div className="absolute inset-0 flex flex-col px-2 pt-5 pb-2">
          <h3 className="font-black text-[9px] uppercase mb-2" style={{ color: st.titleColor }}>
            {slide.title}
          </h3>
          <div className="flex gap-1.5 flex-1">
            {[slide.bullets.slice(0, Math.ceil(slide.bullets.length / 2)),
              slide.bullets.slice(Math.ceil(slide.bullets.length / 2))].map((col, ci) => (
              <div key={ci} className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: st.cardBg }}>
                <div className="px-1.5 py-0.5 text-[7px] font-bold text-white"
                     style={{ backgroundColor: ci === 0 ? '#00C9A7' : '#7C3AED' }}>
                  {ci === 0 ? 'PART A' : 'PART B'}
                </div>
                <div className="p-1.5">
                  {col.slice(0, 3).map((b, i) => (
                    <div key={i} className="flex gap-0.5 mb-0.5">
                      <span className="text-[6px] flex-shrink-0 mt-0.5" style={{ color: st.accent }}>•</span>
                      <span className="text-[6px] leading-snug" style={{ color: st.bodyColor }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BULLETS / CONTENT LAYOUT (default) ── */}
      {!isTitle && !isSummary && !isTwoCol && (
        <div className="absolute inset-0 flex flex-col px-2 pt-5 pb-2">
          <h3 className="font-black text-[9px] uppercase mb-2 truncate" style={{ color: st.titleColor }}>
            {slide.title}
          </h3>
          <div className="flex gap-1.5 flex-1">
            {/* Left content card */}
            <div className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: st.cardBg, border: `1px solid ${st.accent}33` }}>
              <div className="px-2 py-1 text-[7px] font-bold text-white truncate"
                   style={{ backgroundColor: st.accent }}>
                {slide.title}
              </div>
              <div className="p-1.5">
                {slide.bullets.slice(0, 4).map((b, i) => (
                  <div key={i} className="flex gap-0.5 mb-0.5">
                    <span className="text-[6px] flex-shrink-0 mt-0.5" style={{ color: st.accent }}>•</span>
                    <span className="text-[6px] leading-snug line-clamp-1" style={{ color: st.bodyColor }}>{b}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Right key insight panel */}
            <div className="w-16 rounded-lg flex flex-col p-1.5" style={{ backgroundColor: '#0D1B2A', border: '1px solid #2A3F5F' }}>
              <p className="text-[6px] font-bold mb-1" style={{ color: '#FF4B6E' }}>KEY INSIGHT</p>
              <div className="w-full h-px mb-1" style={{ backgroundColor: '#2A3F5F' }} />
              <p className="text-[6px] leading-snug italic" style={{ color: '#C8D6E5' }}>
                {slide.bullets[slide.bullets.length - 1]?.slice(0, 60)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hover overlay showing slide number */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200
                      flex items-center justify-center opacity-0 group-hover:opacity-100">
        <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-full">
          Slide {index + 1}
        </span>
      </div>
    </div>
  );
}

export default function SlidePreview({ slides, theme }: Props) {
  return (
    <div className="bg-[#1A2940] rounded-2xl p-6 border border-[#2A3F5F]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-white">Slide Preview</h3>
          <p className="text-xs text-[#8899AA] mt-0.5">{slides.length} slides · {theme?.replace('_', ' ')} theme</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#8899AA] bg-[#0D1B2A] px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
          Generated
        </div>
      </div>

      {/* Slide grid — 2 columns, actual thumbnail rendering */}
      <div className="grid grid-cols-2 gap-3">
        {slides.map((slide, i) => (
          <SlideThumbnail key={i} slide={slide} index={i} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-[#4A5E7A] mt-4">
        Download PPTX to see full-quality slides with all formatting
      </p>
    </div>
  );
}