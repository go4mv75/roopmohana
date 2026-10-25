export function Logo({ small = false, light = false }: { small?: boolean; light?: boolean }) {
  return (
    <span className={`flex flex-col items-center leading-none ${light ? "text-paper" : "text-ink"}`}>
      <span
        className={`display uppercase whitespace-nowrap ${small ? "text-lg tracking-[0.24em]" : "text-[17px] tracking-[0.16em] sm:text-[22px] sm:tracking-[0.28em] lg:text-[26px]"}`}
        style={{ fontWeight: 500 }}
      >
        Roop<span className="text-sindoor mx-[0.18em]">✦</span>Mohana
      </span>
      {!small && (
        <span className={`font-[family-name:var(--font-deva)] text-[11px] mt-1 tracking-[0.2em] ${light ? "text-paper/70" : "text-muted"}`}>
          रूप मोहना
        </span>
      )}
    </span>
  );
}
