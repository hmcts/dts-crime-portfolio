import { defineCliConfig } from "sanity/cli";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "vi5mhbtl";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "preview";

export default defineCliConfig({
  api: { projectId, dataset },
});
