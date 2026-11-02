
function BrandLogo({ light = false, compact = false }) {
  const textColor = light ? "#FFFFFF" : "#183B4E";
  const subtitleColor = light ? "#D8F5EF" : "#20B8A5";

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-[#183B4E] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 64 64" className="w-12 h-12">
          {/* Silueta de púa */}
          <path
            d="M32 5 C22 14 10 21 13 34 C16 47 26 56 32 60 C38 56 48 47 51 34 C54 21 42 14 32 5Z"
            fill="#20B8A5"
          />

          {/* Letra A */}
          <path
            d="M20 43 L32 17 L44 43 M25 33 H39"
            fill="none"
            stroke="#183B4E"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Onda de sonido */}
          <path
            d="M9 27 Q5 32 9 37 M55 27 Q59 32 55 37"
            fill="none"
            stroke="#F07858"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className="text-xl font-black tracking-[0.13em] leading-tight"
          style={{ color: textColor }}
        >
          ACORDES
        </span>

        {!compact && (
          <span
            className="text-[10px] font-bold tracking-[0.28em] mt-1"
            style={{ color: subtitleColor }}
          >
            MAYORISTA
          </span>
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
