/** The ecobuddi wordmark: Inter 800 in forest green, with the smiley leaf mascot standing in for the "o". */
export function Mascot({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <path d="M33 14c-3-9 5-14 14-11-1 8-7 12-14 11z" fill="#33d24a" />
      <path d="M33 14c3-4 7-6 11-7" stroke="#0a5c2b" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="32" cy="37" r="22" fill="#eaf7c9" stroke="#0a5c2b" strokeWidth="3.5" />
      <circle cx="24.5" cy="34" r="3" fill="#0a5c2b" />
      <circle cx="39.5" cy="34" r="3" fill="#0a5c2b" />
      <circle cx="19" cy="42" r="3.6" fill="#f2a33a" opacity="0.55" />
      <circle cx="45" cy="42" r="3.6" fill="#f2a33a" opacity="0.55" />
      <path d="M24 43q8 8.5 16 0" stroke="#0a5c2b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function Wordmark({ size = 30 }: { size?: number }) {
  const fontSize = Math.round(size * 0.95)
  return (
    <span className="inline-flex items-center text-forest" style={{ fontWeight: 800, fontSize, letterSpacing: '-0.03em', lineHeight: 1 }} aria-label="ecobuddi">
      <span aria-hidden="true">ec</span>
      <Mascot size={size} className="mx-[1px] -translate-y-[1px]" />
      <span aria-hidden="true">buddi</span>
    </span>
  )
}
