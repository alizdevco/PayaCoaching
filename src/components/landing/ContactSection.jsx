import { Mail, Phone } from "lucide-react";

const contactItems = [
  {
    icon: Phone,
    label: "تلفن",
    value: "۰۲۱-۱۲۳۴۵۶۷۸",
  },
  {
    icon: Mail,
    label: "ایمیل",
    value: "info@payamcoaching.ir",
  },
];

export default function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-nav bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl text-[#1C1917] sm:text-4xl">
          ارتباط با ما
        </h2>
        <p className="mt-4 text-base leading-8 text-[#57534E]">
          برای اطلاعات بیشتر با تیم پایا کوچینگ در ارتباط باشید
        </p>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {contactItems.map((item) => (
            <li
              key={item.label}
              className="flex flex-col items-center gap-3 rounded-2xl border border-stone-200/80 bg-[#F7F5F0] p-6"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#064E3B] text-[#6EE7B7]">
                <item.icon size={22} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-[#78716C]">{item.label}</p>
              <p className="text-base font-semibold text-[#1C1917]">{item.value}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
