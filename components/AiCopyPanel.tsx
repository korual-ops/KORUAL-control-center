import type { PromptTemplate } from "@/lib/ai";

export function AiCopyPanel({ templates }: { templates: PromptTemplate[] }) {
  return (
    <div className="grid gap-4">
      {templates.map((template) => (
        <section key={template.title} className="glass-card p-5 transition hover:border-korual-gold/25">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{template.title}</h2>
              <p className="mt-1 text-sm text-korual-mist">{template.description}</p>
            </div>
            <span className="rounded-full border border-korual-gold/30 bg-korual-gold/10 px-3 py-1 text-xs font-semibold text-korual-champagne">
              GPT-ready
            </span>
          </div>
          <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-6 text-korual-mist">
            {template.prompt}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-korual-mist">Quiet luxury</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-korual-mist">Marketplace-ready</span>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-korual-mist">Operator approved</span>
          </div>
        </section>
      ))}
    </div>
  );
}
