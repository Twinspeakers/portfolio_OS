// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer/source-files";
var Project = defineDocumentType(() => ({
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
var contentlayer_config_default = makeSource({
  contentDirPath: "content",
  documentTypes: [Project]
});
export {
  Project,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-PYQLCCRN.mjs.map
