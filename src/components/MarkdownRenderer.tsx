import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function formatInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[0.88em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-list`} className="list-disc pl-5 space-y-1.5 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {formatInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`empty-${index}`);
      return;
    }

    if (line.startsWith('### ')) {
      flushList(`h3-${index}`);
      elements.push(
        <h4
          key={index}
          className="font-bold text-sm uppercase tracking-wider mt-4 mb-1.5 opacity-90"
        >
          {formatInline(line.slice(4))}
        </h4>
      );
      return;
    }

    if (line.startsWith('## ')) {
      flushList(`h2-${index}`);
      elements.push(
        <h3 key={index} className="font-bold text-base mt-4 mb-1.5">
          {formatInline(line.slice(3))}
        </h3>
      );
      return;
    }

    if (line.startsWith('# ')) {
      flushList(`h1-${index}`);
      elements.push(
        <h2 key={index} className="font-bold text-lg mt-4 mb-2">
          {formatInline(line.slice(2))}
        </h2>
      );
      return;
    }

    if (/^[-*•]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*•]\s+/, ''));
      return;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushList(`num-${index}`);
      elements.push(
        <div key={index} className="my-1.5 leading-relaxed">
          {formatInline(line)}
        </div>
      );
      return;
    }

    if (line.startsWith('> ')) {
      flushList(`quote-${index}`);
      elements.push(
        <blockquote
          key={index}
          className="border-l-2 border-indigo-500/60 pl-3 italic opacity-85 my-2"
        >
          {formatInline(line.slice(2))}
        </blockquote>
      );
      return;
    }

    flushList(`p-${index}`);
    elements.push(
      <p key={index} className="my-2 leading-relaxed">
        {formatInline(line)}
      </p>
    );
  });

  flushList('final');

  return <div className={`text-sm ${className}`}>{elements}</div>;
};
