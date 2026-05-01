import { MultiSelectDropdown, type DropdownOption } from "./MultiSelectDropdown";
import type { PortfolioFilters } from "@/lib/portfolio/filters";
import type { ReferenceData } from "@/lib/portfolio/referenceData";

interface ReferenceDataFiltersProps {
  data: ReferenceData;
  filters: PortfolioFilters;
}

/**
 * Six reference-data-backed multi-select dropdowns: Group, Directorate,
 * Business area, Owner, Capability, Action plan. Spec:
 * openspec/specs/portfolio-management/spec.md (Multi-select filters).
 */
export function ReferenceDataFilters({ data, filters }: ReferenceDataFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MultiSelectDropdown
        paramName="group"
        label="Group"
        active={filters.groupIds}
        options={data.groups.map(toOption)}
      />
      <MultiSelectDropdown
        paramName="directorate"
        label="Directorate"
        active={filters.directorateIds}
        options={data.directorates.map((directorate) => ({
          value: directorate._id,
          label: directorate.name,
          sublabel: directorate.group?.name ?? undefined,
        }))}
      />
      <MultiSelectDropdown
        paramName="businessArea"
        label="Business area"
        active={filters.businessAreaIds}
        options={data.businessAreas.map(toOption)}
      />
      <MultiSelectDropdown
        paramName="owner"
        label="Owner"
        active={filters.ownerIds}
        options={data.people.map((person) => ({
          value: person._id,
          label: person.name,
          sublabel: person.email,
        }))}
      />
      <MultiSelectDropdown
        paramName="capability"
        label="Capability"
        active={filters.capabilityIds}
        options={data.capabilities.map(toOption)}
      />
      <MultiSelectDropdown
        paramName="action"
        label="Action plan"
        active={filters.actionIds}
        options={data.actions.map((action) => ({
          value: action._id,
          label: `${action.actionNo} ${action.name}`,
          sublabel: action.strand,
        }))}
      />
    </div>
  );
}

function toOption(reference: { _id: string; name: string }): DropdownOption {
  return { value: reference._id, label: reference.name };
}
