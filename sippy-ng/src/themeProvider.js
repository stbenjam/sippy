// Predictable class names for test snapshots.
export default function generateClassName (rule, sheet) {
  return `${sheet.options.classNamePrefix}-${rule.key}`
}
