export default function Flash({ erro, ok }: { erro?: string; ok?: string }) {
  if (!erro && !ok) return null;
  return (
    <div
      role="status"
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        erro ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {erro ?? ok}
    </div>
  );
}
