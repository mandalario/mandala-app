type Props = {
  size?: "sm" | "md" | "lg";
  align?: "center" | "left";
  className?: string;
};

const sizes = {
  sm: { main: "text-lg", sub: "text-[9px]" },
  md: { main: "text-2xl", sub: "text-[11px]" },
  lg: { main: "text-4xl md:text-5xl", sub: "text-xs md:text-sm" },
};

export const Brand = ({ size = "md", align = "center", className = "" }: Props) => {
  const s = sizes[size];
  return (
    <div className={`leading-none ${align === "center" ? "text-center" : "text-left"} ${className}`}>
      <h1 className={`font-bold tracking-tight text-white ${s.main}`}>Mandala Rio</h1>
      <p className={`uppercase tracking-[0.35em] mt-1.5 font-medium text-sky-300 ${s.sub}`}>
        Surf School
      </p>
    </div>
  );
};
