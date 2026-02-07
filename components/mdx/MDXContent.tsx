import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MDXComponents } from "@/components/mdx/MDXComponents";

type MDXContentProps = {
  source: string;
};

export function MDXContent({ source }: MDXContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MDXComponents}>
      {source}
    </ReactMarkdown>
  );
}
