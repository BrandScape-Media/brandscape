import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders LLM output (GitHub-flavored markdown) with the dashboard's dark
 * styling. Raw HTML in the source is NOT rendered (react-markdown default),
 * so model output can't inject markup.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="bs-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="font-heading font-bold text-lg text-white mt-7 mb-3 first:mt-0">{children}</h2>,
          h2: ({ children }) => <h3 className="font-heading font-bold text-base text-white mt-6 mb-2.5 first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="font-heading font-semibold text-sm text-brand-200 mt-5 mb-2 tracking-wide first:mt-0">{children}</h4>,
          h4: ({ children }) => <h5 className="font-heading font-semibold text-xs text-brand-300 mt-4 mb-2 tracking-wider uppercase first:mt-0">{children}</h5>,
          p: ({ children }) => <p className="text-brand-300 text-sm font-body leading-relaxed mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5 marker:text-brand-600">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5 marker:text-brand-500">{children}</ol>,
          li: ({ children }) => <li className="text-brand-300 text-sm font-body leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-brand-200">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/15 pl-4 my-3 text-brand-400 [&_p]:text-brand-400">{children}</blockquote>
          ),
          code: ({ className, children }) =>
            className?.includes('language-') ? (
              <code className="block text-brand-200 text-xs font-mono leading-relaxed">{children}</code>
            ) : (
              <code className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/5 text-brand-200 text-[0.8em] font-mono">{children}</code>
            ),
          pre: ({ children }) => (
            <pre className="bg-brand-900/60 border border-white/5 rounded-lg p-4 mb-3 overflow-x-auto">{children}</pre>
          ),
          hr: () => <hr className="border-white/5 my-5" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3 border border-white/5 rounded-lg">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-brand-900/50">{children}</thead>,
          th: ({ children }) => (
            <th className="text-left px-4 py-2.5 font-heading font-semibold text-xs text-brand-300 tracking-wide border-b border-white/5">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-brand-300 text-sm font-body border-b border-white/[0.03] align-top">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
