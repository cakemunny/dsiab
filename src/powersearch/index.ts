// Copyright (c) Meta Platforms, Inc. and affiliates.

/**
 * @file index.ts
 * @output Public API of the PowerSearch MODEL layer (B5 Step 1)
 * @position Entry point; the render layer (components/CSS) lands in later steps.
 *
 * This barrel intentionally exports ONLY the pure model layer — types, config
 * builders, the internal lookup config, the field search source, and the value
 * formatter. No React components are exported yet.
 */

export {
  createPowerSearchConfig,
  usePowerSearchConfig,
  resolveRangePart,
  toUnixSeconds,
} from "./usePowerSearchConfig";
export type { FieldDefinition, InferData } from "./usePowerSearchConfig";

export { createInternalConfig, useInternalConfig } from "./useInternalConfig";
export type { InternalConfig } from "./useInternalConfig";

export {
  createPowerSearchSource,
  usePowerSearchSource,
} from "./usePowerSearchSource";

export { formatFilterValue } from "./formatFilterValue";

export type {
  // Config types
  PowerSearchConfig,
  PowerSearchField,
  PowerSearchOperator,

  // Operator value types
  OperatorValue,
  EmptyOperatorValue,
  StringOperatorValue,
  StringListOperatorValue,
  IntegerOperatorValue,
  FloatOperatorValue,
  TimeOperatorValue,
  DateAbsoluteOperatorValue,
  DateRelativeOperatorValue,
  DateRangeOperatorValue,
  EnumOperatorValue,
  EnumListOperatorValue,
  EntityListOperatorValue,
  CustomOperatorValue,
  NestedOperatorValue,

  // Filter value types
  FilterValue,
  FilterValueEmpty,
  FilterValueString,
  FilterValueStringList,
  FilterValueInteger,
  FilterValueFloat,
  FilterValueTime,
  FilterValueDateAbsolute,
  FilterValueDateRelative,
  FilterValueDateRange,
  FilterValueEnum,
  FilterValueEnumList,
  FilterValueEntityList,
  FilterValueCustom,
  FilterValueNested,

  // Filter types
  PowerSearchFilter,
  PartialFilter,

  // Supporting types
  EnumItem,
  PowerSearchEntity,
  DateTimeRange,
  DateTimeRangePart,
  DateRangeFilterPreset,
  RelativeDateFilterPreset,
  OperatorTokenizationConfig,
  PowerSearchChangeType,
  PowerSearchHandle,

  // Typeahead source item
  PowerSearchAuxData,
  PowerSearchItem,

  // Component override types
  PowerSearchTokenProps,
  PowerSearchEditorProps,
  PowerSearchComponentOverride,
  PowerSearchComponents,
} from "./types";
