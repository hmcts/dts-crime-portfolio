import type { SchemaTypeDefinition } from "sanity";

import { person } from "./documents/person";
import { group } from "./documents/group";
import { directorate } from "./documents/directorate";
import { businessArea } from "./documents/businessArea";
import { capability } from "./documents/capability";
import { action } from "./documents/action";
import { changeLog } from "./documents/changeLog";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Reference data
  person,
  group,
  directorate,
  businessArea,
  capability,
  action,
  // Cross-cutting
  changeLog,
];
