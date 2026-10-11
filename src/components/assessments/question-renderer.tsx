'use client'

import 'katex/dist/katex.min.css'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

interface QuestionRendererProps {
  content: string
  className?: string
}

export function QuestionRenderer({ content, className }: QuestionRendererProps) {
  if (!content?.trim()) return null

  return (
    <div className={`prose prose-sm max-w-none break-words [&_p]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_code]:rounded [&_code]:bg-muted/40 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
