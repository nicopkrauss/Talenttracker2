/**
 * Timecard Headers Column Definitions
 * 
 * Explicit column lists for timecard_headers table to avoid wildcard selects
 * that might fail when schema changes.
 */

export const TIMECARD_HEADERS_COLUMNS = [
  'id',
  'user_id',
  'project_id',
  'status',
  'submitted_at',
  'rejection_reason',
  'rejected_fields',
  'admin_notes',
  'period_start_date',
  'period_end_date',
  'total_hours',
  'total_break_duration',
  'total_pay',
  'pay_rate',
  'manually_edited',
  'edit_comments',
  'admin_edited',
  'last_edited_by',
  'edit_type',
  'created_at',
  'updated_at'
] as const

export const TIMECARD_HEADERS_SELECT = TIMECARD_HEADERS_COLUMNS.join(', ')