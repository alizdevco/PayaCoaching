export default function SectionLabel({ label }) {
  return (
    <div
      className="pointer-events-none absolute end-0 top-1/2 hidden -translate-y-1/2 xl:block"
      aria-hidden="true"
    >
      <span className="inline-block origin-center rotate-90 rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-medium tracking-wide text-[#78716C]">
        {label}
      </span>
    </div>
  );
}
