import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

export const MDXComponents: Components = {
  h2: (props) => (
    <h2 className="mt-8 text-2xl font-semibold tracking-tight" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-6 text-xl font-semibold" {...props} />
  ),
  p: (props) => (
    <p className="mt-4 leading-7 text-muted-foreground" {...props} />
  ),
  ul: (props) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground" {...props} />
  ),
  pre: (props) => (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-black/60 p-4 text-sm" {...props} />
  ),
  code: ({ className, children, ...props }) => (
    <code className={cn("rounded bg-muted px-1 py-0.5 text-sm", className)} {...props}>{children}</code>
  ),
  blockquote: (props) => (
    <blockquote className="mt-4 rounded-r-lg border-l-4 border-primary bg-primary/10 p-4 text-sm text-primary-foreground/90" {...props} />
  )
};
