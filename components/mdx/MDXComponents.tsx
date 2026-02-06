import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const MDXComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="mt-8 text-2xl font-semibold tracking-tight" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-6 text-xl font-semibold" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mt-4 leading-7 text-muted-foreground" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground" {...props} />
  ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-black/60 p-4 text-sm" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code className={cn("rounded bg-muted px-1 py-0.5 text-sm", props.className)} {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="mt-4 rounded-r-lg border-l-4 border-primary bg-primary/10 p-4 text-sm text-primary-foreground/90" {...props} />
  )
};