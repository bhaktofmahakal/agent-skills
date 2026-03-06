"use client";

type CommandSurfaceProps = {
  onRun: () => void;
  onOpenLibrary: () => void;
  onTidy: () => void;
  disabledRun?: boolean;
};

export function CommandSurface({
  onRun,
  onOpenLibrary,
  onTidy,
  disabledRun = false,
}: CommandSurfaceProps) {
  return (
    <div className="flex items-center gap-2 border-t border-white/10 bg-[#151515] p-2">
      <button onClick={onOpenLibrary} className="rounded border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10">
        Add Node/File
      </button>
      <button onClick={onTidy} className="rounded border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10">
        Tidy Layout
      </button>
      <button
        onClick={onRun}
        disabled={disabledRun}
        className="rounded bg-[#f04d26] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        Run
      </button>
      <span className="ml-auto text-[11px] text-white/45">Shortcuts: `Tab`, `Ctrl/Cmd+A`, `Shift+Alt+T`</span>
    </div>
  );
}
