"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import type { PublicPlanFaq } from "@/lib/api/plans";

export function PlanFaqSection({ faqs }: { faqs: PublicPlanFaq[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0) return null;

  return (
    <section className="container-app py-16 sm:py-20">
      <h2 className="section-title text-center text-zinc-900 dark:text-zinc-100">
        Frequently Asked Questions
      </h2>
      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div key={faq.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <HelpCircle className="h-5 w-5 shrink-0 text-primary-600" />
                <span className="flex-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <p className="animate-fade-in px-4 pb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {faq.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
