import { Phone, Send } from "lucide-react";

import { toPersianDigits } from "../../lib/persianDate.js";

const contactItems = [
  {
    icon: Phone,
    label: "تلفن",
    value: toPersianDigits("09309092465"),
    href: "tel:09309092465",
  },
  {
    icon: Send,
    label: "تلگرام",
    value: "paya_coaching@",
    href: "https://t.me/paya_coaching",
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
              <a
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="text-base font-semibold text-[#1C1917] underline-offset-4 transition-colors hover:text-[#064E3B] hover:underline"
              >
                {item.value}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
