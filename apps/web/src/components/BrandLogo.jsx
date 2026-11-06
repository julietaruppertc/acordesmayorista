
function BrandLogo({ light = false, compact = false }) {
  const textColor = light ? "#FFFFFF" : "#183B4E";
  const subtitleColor = light ? "#D8F5EF" : "#137B6C";

  return (
    <div className="flex items-center gap-3" aria-label="Acordes Mayorista">
      <div className="w-14 h-14 rounded-[18px] bg-[#183B4E] flex items-center justify-center shrink-0 shadow-[0_7px_18px_rgba(24,59,78,0.18)] ring-1 ring-white/10">
        <svg
          viewBox="0 0 64 64"
          className="w-12 h-12"
          role="img"
          aria-hidden="true"
        >
          {/* Monograma A inspirado en cuerdas de un instrumento */}
          <path
            d="M15.5 45.5 29.1 17.8c1.2-2.5 4.7-2.5 5.9 0l13.5 27.7"
            fill="none"
            stroke="#48D2C0"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Onda musical que forma el travesaño de la A */}
          <path
            d="M22 35.5c3.2-4.8 6.3 4.8 9.6 0s6.5 4.8 10.4 0"
            fill="none"
            stroke="#F07858"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Punto de la nota: acento reconocible a tamaños pequeños */}
          <circle cx="47.5" cy="18" r="4" fill="#F07858" />
        </svg>
      </div>

      <div className="flex flex-col min-w-0">
        <span
          className="text-[20px] font-black tracking-[0.1em] leading-none"
          style={{ color: textColor }}
        >
          ACORDES
        </span>

        {!compact && (
          <span
            className="flex items-center gap-2 text-[9px] font-extrabold tracking-[0.3em] mt-1.5"
            style={{ color: subtitleColor }}
          >
            <span className="block w-3.5 h-0.5 rounded-full bg-[#F07858]" />
            MAYORISTA
          </span>
        )}
      </div>
    </div>
  );
}

export default BrandLogo;
