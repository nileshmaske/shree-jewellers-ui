/**
 * Original decorative vector artwork authored for Shree Jewellers.
 * This component does not load or embed third-party photography.
 */
type ArtworkProps = { className?: string };

export function BrandEmblem({ className }: ArtworkProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <path d="M24 4 42 24 24 44 6 24 24 4Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="m24 11 12 13-12 13-12-13 12-13Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M24 11v26M12 24h24" stroke="currentColor" strokeWidth=".95" opacity=".8" />
      <circle cx="24" cy="24" r="3.3" fill="currentColor" />
      <circle cx="24" cy="4" r="1.4" fill="currentColor" />
      <circle cx="42" cy="24" r="1.4" fill="currentColor" />
      <circle cx="6" cy="24" r="1.4" fill="currentColor" />
      <circle cx="24" cy="44" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function JewelleryArtwork({ className }: ArtworkProps) {
  return (
    <svg className={className} viewBox="0 0 580 580" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sj-metal" x1="118" y1="70" x2="458" y2="514" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBE8B9" />
          <stop offset=".3" stopColor="#BC8E49" />
          <stop offset=".58" stopColor="#F0D8A3" />
          <stop offset="1" stopColor="#95682F" />
        </linearGradient>
        <linearGradient id="sj-stone" x1="184" y1="163" x2="410" y2="408" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4F2D8" />
          <stop offset=".35" stopColor="#8DBBB1" />
          <stop offset=".73" stopColor="#285B57" />
          <stop offset="1" stopColor="#102F31" />
        </linearGradient>
        <linearGradient id="sj-facet" x1="235" y1="176" x2="380" y2="368" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity=".94" />
          <stop offset="1" stopColor="#D1E6D2" stopOpacity=".1" />
        </linearGradient>
        <radialGradient id="sj-halo" cx="0" cy="0" r="1" gradientTransform="translate(302 300) rotate(90) scale(234)">
          <stop stopColor="#EEC981" stopOpacity=".20" />
          <stop offset="1" stopColor="#EEC981" stopOpacity="0" />
        </radialGradient>
        <filter id="sj-drop" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="13" />
          <feOffset dx="3" dy="20" />
          <feComponentTransfer><feFuncA type="linear" slope=".23" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx="288" cy="286" r="248" fill="url(#sj-halo)" />
      <circle cx="291" cy="286" r="228" stroke="#E1BF80" strokeOpacity=".23" strokeWidth="1" />
      <circle cx="291" cy="286" r="195" stroke="#F2DAA2" strokeOpacity=".30" strokeWidth="1" strokeDasharray="2 10" />
      <circle cx="291" cy="286" r="163" stroke="#E1BF80" strokeOpacity=".14" strokeWidth="1" />
      <path d="M73 286h47m346 0h43M291 52v48m0 373v48" stroke="#F1D59E" strokeOpacity=".45" strokeWidth="1" />
      <path d="M146 133 177 164m229 230 31 31M437 133l-31 31M177 394l-31 31" stroke="#F1D59E" strokeOpacity=".24" strokeWidth="1" />

      {/* A geometric jewel pendant: original faceted design. */}
      <g filter="url(#sj-drop)">
        <path d="m291 138 139 116-139 190-139-190 139-116Z" fill="url(#sj-metal)" />
        <path d="m291 157 121 100-121 162-121-162 121-100Z" fill="#163B39" />
        <path d="m291 161 116 96-116 155-116-155 116-96Z" fill="url(#sj-stone)" />
        <path d="m175 257 63-62 53-34-40 96h-76Z" fill="#C1E1D0" opacity=".65" />
        <path d="m291 161 53 34 63 62h-76l-40-96Z" fill="#E0F1DC" opacity=".52" />
        <path d="m251 257 40-96 40 96h-80Z" fill="url(#sj-facet)" opacity=".86" />
        <path d="M175 257h76l40 155-116-155Z" fill="#6EA89C" opacity=".48" />
        <path d="M331 257h76L291 412l40-155Z" fill="#18484A" opacity=".8" />
        <path d="M251 257h80l-40 155-40-155Z" fill="#A8D6C4" opacity=".76" />
        <path d="m291 161-40 96 40 155 40-155-40-96ZM175 257h232" stroke="#E9E9CD" strokeOpacity=".5" strokeWidth="1.6" />
        <path d="m291 138 139 116-139 190-139-190 139-116Z" stroke="#FFF1CC" strokeOpacity=".92" strokeWidth="2" />
      </g>
      <path d="M250 133c15-18 67-18 82 0" stroke="url(#sj-metal)" strokeWidth="8" strokeLinecap="round" />
      <path d="M207 93c29-23 62-34 84-34s55 11 84 34" stroke="url(#sj-metal)" strokeWidth="3" strokeLinecap="round" />
      <path d="M207 93c-23 14-40 30-53 50M375 93c23 14 40 30 53 50" stroke="#E3C184" strokeOpacity=".8" strokeWidth="2" />

      <path d="m118 169 4.2 11.8L134 185l-11.8 4.2L118 201l-4.2-11.8L102 185l11.8-4.2L118 169Z" fill="#FBE4AF" opacity=".8" />
      <path d="m452 333 3.4 9.6 9.6 3.4-9.6 3.4-3.4 9.6-3.4-9.6-9.6-3.4 9.6-3.4 3.4-9.6Z" fill="#FBE4AF" opacity=".78" />
      <circle cx="435" cy="165" r="3.4" fill="#F1D6A0" />
      <circle cx="150" cy="376" r="2.8" fill="#F1D6A0" opacity=".7" />
      <circle cx="291" cy="511" r="3" fill="#E8BF79" opacity=".65" />
    </svg>
  );
}
