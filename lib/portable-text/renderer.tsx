import { PortableText, type PortableTextComponents, type PortableTextProps } from "@portabletext/react";

const defaultComponents: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>,
    h2: ({ children }) => <h2 className="mt-4 text-xl font-semibold tracking-tight">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-3 text-lg font-semibold">{children}</h3>,
    normal: ({ children }) => <p className="mt-2 leading-relaxed text-neutral-700">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="mt-3 border-l-4 border-neutral-300 pl-4 italic text-neutral-700">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="mt-2 list-disc pl-6 text-neutral-700">{children}</ul>,
    number: ({ children }) => <ol className="mt-2 list-decimal pl-6 text-neutral-700">{children}</ol>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ value, children }) => (
      <a
        href={value?.href}
        className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
        rel="noreferrer"
        target={value?.href?.startsWith("http") ? "_blank" : undefined}
      >
        {children}
      </a>
    ),
  },
};

/**
 * Shared Portable Text renderer used in the dossier updates timeline, FAQ
 * answers, learning bodies, prompt summaries, action plan progress notes,
 * and any future digest emails. Adding new mark/block types here keeps
 * rendering consistent across surfaces.
 *
 * Spec: openspec/specs/project-dossier/spec.md (Updates timeline) and
 * openspec/specs/help-faq/spec.md (Expandable Q&A panels).
 */
export function PortableTextRenderer(props: Omit<PortableTextProps, "components"> & {
  components?: PortableTextComponents;
}) {
  const { components, ...rest } = props;
  return <PortableText {...rest} components={{ ...defaultComponents, ...components }} />;
}
