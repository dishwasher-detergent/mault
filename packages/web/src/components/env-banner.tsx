const ENV = import.meta.env.VITE_APP_ENV as string | undefined;

const CONFIG = {
  local: {
    label: "Local",
    className: "bg-pink-400/90 text-pink-950",
  },
  development: {
    label: "Development",
    className: "bg-amber-400/90 text-amber-950",
  },
  qa: {
    label: "QA",
    className: "bg-violet-500/90 text-violet-50",
  },
} satisfies Record<string, { label: string; className: string }>;

type KnownEnv = keyof typeof CONFIG;

function isKnownEnv(env: string | undefined): env is KnownEnv {
  return !!env && env in CONFIG;
}

export function EnvBanner({ className }: { className?: string }) {
  if (!isKnownEnv(ENV)) return null;
  const { label, className: colorClass } = CONFIG[ENV];

  return (
    <div
      className={`rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tracking-widest uppercase select-none ${colorClass} ${className ?? ""}`}
    >
      {label} Environment
    </div>
  );
}
