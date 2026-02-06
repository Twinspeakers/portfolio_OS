import { defineDocumentType, makeSource } from "contentlayer/source-files";

export const Project = defineDocumentType(() => ({
  name: "Project",
  filePathPattern: "projects/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    slug: { type: "string", required: true },
    summary: { type: "string", required: true },
    status: { type: "enum", options: ["active", "paused", "done"], required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
    stack: { type: "list", of: { type: "string" }, required: true },
    featured: { type: "boolean", default: false },
    createdAt: { type: "date", required: false },
    updatedAt: { type: "date", required: true },
    links: { type: "json", required: false }
  },
  computedFields: {
    url: {
      type: "string",
      resolve: (doc) => `/projects/${doc.slug}`
    }
  }
}));

export default makeSource({
  contentDirPath: "content",
  documentTypes: [Project]
});