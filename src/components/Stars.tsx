export default function Stars({ value, count }: { value: number; count?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`Nota ${value.toFixed(1)} de 5`}>
      <span className="text-amber-500" aria-hidden>
        {"★".repeat(full)}
        <span className="text-slate-300">{"★".repeat(5 - full)}</span>
      </span>
      {count !== undefined && <span className="text-slate-500">({count})</span>}
    </span>
  );
}
