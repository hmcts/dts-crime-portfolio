import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";

import { schemaTypes } from "./sanity/schemas";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "vi5mhbtl";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "preview";

export default defineConfig({
  name: "default",
  title: "DTS Crime Portfolio",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
