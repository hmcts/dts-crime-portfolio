import type { SchemaTypeDefinition } from "sanity";

import { person } from "./documents/person";
import { group } from "./documents/group";
import { directorate } from "./documents/directorate";
import { businessArea } from "./documents/businessArea";
import { capability } from "./documents/capability";
import { action } from "./documents/action";
import { changeLog } from "./documents/changeLog";
import { editorAccess } from "./documents/editorAccess";
import { project } from "./documents/project";
import { learningItem } from "./documents/learningItem";
import { event } from "./documents/event";
import { reportingCut } from "./documents/reportingCut";
import { previewSession } from "./documents/previewSession";
import { reminderSend } from "./documents/reminderSend";
import { tooltipExplainer } from "./documents/tooltipExplainer";

import { tieringAssessment } from "./objects/tieringAssessment";
import { surveyDetails } from "./objects/surveyDetails";
import { projectUpdate } from "./objects/projectUpdate";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Documents — reference data
  person,
  group,
  directorate,
  businessArea,
  capability,
  action,
  // Documents — core
  project,
  // Documents — community / content
  // (prompts moved to Postgres on 2026-05-03 — see
  // decisions/2026-05-03-postgres-prompts-spike.md)
  learningItem,
  event,
  // Documents — operational / audit
  changeLog,
  editorAccess,
  reportingCut,
  previewSession,
  reminderSend,
  tooltipExplainer,
  // Embedded objects
  tieringAssessment,
  surveyDetails,
  projectUpdate,
];
