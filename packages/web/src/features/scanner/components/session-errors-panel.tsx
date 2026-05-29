import type { SessionError } from "@/features/scanner/api/use-session-monitor";

export function SessionErrorsPanel({ errors }: { errors: SessionError[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 overflow-hidden">
      <p className="text-[10px] font-medium text-destructive uppercase tracking-wide px-2 pt-2 pb-1.5">
        Errors
      </p>
      <div className="flex flex-col divide-y divide-destructive/10 max-h-48 overflow-y-auto">
        {errors.map((err) => (
          <div key={err.id} className="px-2 py-1.5">
            <p className="text-[11px] text-destructive leading-snug">{err.message}</p>
            <p className="text-[10px] text-destructive/60 mt-0.5">
              {new Date(err.timestamp).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
