export default function Card({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag
      className={[
        "admin-card rounded-xl bg-white p-5 dark:bg-[#1e293b]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}
