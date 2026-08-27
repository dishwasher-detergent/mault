export function PublicGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] overflow-hidden"
    >
      <div className="absolute top-[-12rem] left-1/2 size-125 -translate-x-1/2 rounded-full bg-primary/25 blur-[110px] dark:bg-primary/20" />
      <div className="absolute top-24 right-[-6rem] size-80 rounded-full bg-primary/10 blur-[100px]" />
    </div>
  );
}
