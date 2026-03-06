"use client";

type SectionSeparatorSystemProps = {
  compact?: boolean;
};

function NodeMark() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
      <rect x="0.5" y="0.5" width="8" height="8" rx="2" fill="#F04D26" />
    </svg>
  );
}

export function SectionSeparatorSystem({ compact = false }: SectionSeparatorSystemProps) {
  if (compact) {
    return (
      <div className="mx-auto flex w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px] items-center justify-center gap-3 py-3">
        <NodeMark />
        <div className="h-px w-20 bg-white/25 md:w-40" />
        <NodeMark />
        <div className="h-px w-20 bg-white/25 md:w-40" />
        <NodeMark />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto hidden w-[90%] sm:w-[88%] md:w-[85%] lg:w-[80%] max-w-[1400px] items-center justify-center gap-4 py-4 lg:flex">
        <NodeMark />
        <div className="h-px w-56 bg-white/25" />
        <NodeMark />
        <svg width="31" height="31" viewBox="0 0 31 31" aria-hidden="true">
          <rect x="0.5" y="0.5" width="30" height="30" rx="4.5" fill="#111111" stroke="#FF6E00" />
          <path d="m7 24 1-5h6l-1 5zm7-5 1-6h5l-1 6z" fill="#F04D26" />
          <path d="m12 16 1-5h11l1-5H8L6 16z" fill="#F04D26" />
        </svg>
        <NodeMark />
        <div className="h-px w-56 bg-white/25" />
        <NodeMark />
      </div>

      <div className="mx-auto flex w-[90%] items-center justify-center gap-3 py-2 lg:hidden">
        <NodeMark />
        <div className="h-px w-14 bg-white/25" />
        <NodeMark />
        <div className="h-px w-14 bg-white/25" />
        <NodeMark />
      </div>
    </>
  );
}
