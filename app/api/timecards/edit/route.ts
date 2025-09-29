import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { TIMECARD_HEADERS_SELECT } from '@/lib/timecard-columns'
import { canApproveTimecardsWithSettings } from '@/lib/role-utils'
import { withTimecardAuditLogging, type TimecardAuditContext } from '@/lib/timecard-audit-integration'
import { AuditLogService } from '@/lib/audit-log-service'

const editTimecardSchema = z.object({
  timecardId: z.string().uuid(),
  updates: z.record(z.any()), // Allow any fields in updates to support desktop format
  // Original schema was too restrictive for desktop format fields like "check_in_time_day_0"
  dailyUpdates: z.record(z.object({
    check_in_time: z.string().nullable().optional(),
    check_out_time: z.string().nullable().optional(),
    break_start_time: z.string().nullable().optional(),
    break_end_time: z.string().nullable().optional(),
    total_hours: z.number().min(0).optional(),
    break_duration: z.number().min(0).optional(),
  })).optional(), // For multi-day timecard daily entry updates
  adminNote: z.string().optional(), // For private admin notes (admin_notes field)
  editComment: z.string().optional(), // For user-facing edit explanations (edit_comments field)
  returnToDraft: z.boolean().optional(), // Flag for "Edit & Return" action
})

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    console.log('🔍 REQUEST DEBUG: Raw request body:', JSON.stringify(body, null, 2))
    
    const validationResult = editTimecardSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('❌ VALIDATION ERROR:', validationResult.error.flatten().fieldErrors)
      return NextResponse.json(
        { 
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      )
    }
    
    console.log('✅ VALIDATION SUCCESS: Request body validated')

    const { timecardId, updates, dailyUpdates, adminNote, editComment, returnToDraft } = validationResult.data

    // Validate timecard exists and get current data
    console.log('🔍 Looking for timecard:', timecardId)
    
    const { data: timecard, error: fetchError } = await supabase
      .from('timecard_headers')
      .select(TIMECARD_HEADERS_SELECT)
      .eq('id', timecardId)
      .single()

    console.log('🔍 Timecard lookup result:', {
      found: !!timecard,
      error: fetchError?.message,
      errorCode: fetchError?.code
    })

    if (fetchError || !timecard) {
      // Try to find any timecard with this ID regardless of status
      const { data: anyTimecard, error: anyError } = await supabase
        .from('timecard_headers')
        .select('id, status, user_id, project_id')
        .eq('id', timecardId)
        .maybeSingle()
      
      console.log('🔍 Any status lookup:', {
        found: !!anyTimecard,
        data: anyTimecard,
        error: anyError?.message
      })
      
      return NextResponse.json(
        { 
          error: 'Timecard not found', 
          code: 'TIMECARD_NOT_FOUND',
          debug: {
            timecardId,
            originalError: fetchError?.message,
            anyStatusFound: !!anyTimecard,
            anyStatusData: anyTimecard
          }
        },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get global settings for permission check
    const { data: globalSettings } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single()

    const canApprove = canApproveTimecardsWithSettings(profile.role, globalSettings)
    const isOwner = user.id === timecard.user_id

    // Permission checks based on action type
    if (returnToDraft) {
      // "Edit & Return" action - only approvers can return submitted timecards to draft
      if (!canApprove) {
        return NextResponse.json(
          { error: 'Insufficient permissions to return timecard to draft', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        )
      }
      if (timecard.status !== 'submitted') {
        return NextResponse.json(
          { error: 'Only submitted timecards can be returned to draft', code: 'INVALID_STATUS' },
          { status: 400 }
        )
      }
    } else {
      // Regular editing - allow editing draft timecards, or submitted timecards if being rejected
      const isRejectionEdit = updates.status === 'rejected'
      
      if (timecard.status !== 'draft' && !isRejectionEdit) {
        return NextResponse.json(
          { error: 'Only draft timecards can be edited', code: 'INVALID_STATUS' },
          { status: 400 }
        )
      }
      
      // For rejection edits, only approvers can edit submitted timecards
      if (isRejectionEdit && timecard.status === 'submitted' && !canApprove) {
        return NextResponse.json(
          { error: 'Insufficient permissions to reject and edit this timecard', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        )
      }
      
      if (!isOwner && !canApprove) {
        return NextResponse.json(
          { error: 'Insufficient permissions to edit this timecard', code: 'INSUFFICIENT_PERMISSIONS' },
          { status: 403 }
        )
      }
    }

    // Prepare update data - filter out desktop format fields from header updates
    const timeFieldPattern = /^(check_in_time|break_start_time|break_end_time|check_out_time)_day_(\d+)$/
    const headerUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => !timeFieldPattern.test(key))
    )
    
    const updateData: any = {
      ...headerUpdates,
      updated_at: new Date().toISOString(),
    }
    
    console.log('🔍 HEADER UPDATE DEBUG: Filtered headerUpdates:', JSON.stringify(headerUpdates, null, 2))
    console.log('🔍 HEADER UPDATE DEBUG: Final updateData:', JSON.stringify(updateData, null, 2))

    // Handle "Edit & Return" action
    if (returnToDraft) {
      updateData.status = 'draft'
      updateData.admin_edited = true
      updateData.last_edited_by = user.id
      updateData.submitted_at = null // Clear submission timestamp
      
      // For "Edit & Return", use editComment for user-facing feedback
      if (editComment) {
        updateData.edit_comments = editComment
      }
      
      // Admin notes are separate and private
      if (adminNote) {
        updateData.admin_notes = adminNote
      }
    } else {
      // Regular edit handling
      
      // Handle rejection edits
      if (updates.status === 'rejected') {
        updateData.admin_edited = true
        updateData.last_edited_by = user.id
        updateData.edit_type = 'rejection_edit'
        
        // Store rejection reason in the rejection_reason field
        if (editComment) {
          updateData.rejection_reason = editComment
        }
        
        // Store rejected fields (fields that were edited)
        const editedFields = Object.keys(updates).filter(key => key !== 'status')
        if (editedFields.length > 0) {
          updateData.rejected_fields = editedFields
        }
        console.log('🔍 Edited fields during rejection:', editedFields)
        
        console.log('🔍 REJECTED FIELDS DEBUG: editedFields:', editedFields)
        
        // Store admin notes separately
        if (adminNote && canApprove) {
          updateData.admin_notes = adminNote
        }
      } else {
        // Regular edit handling
        
        // Handle user-facing edit comments
        if (editComment) {
          updateData.edit_comments = editComment
        }
        
        // Handle private admin notes (only for authorized users)
        if (adminNote && canApprove) {
          updateData.admin_notes = adminNote
        }

        // If admin is editing someone else's timecard, mark as admin edited
        if (!isOwner && canApprove) {
          updateData.admin_edited = true
          updateData.last_edited_by = user.id
          updateData.edit_type = 'admin_adjustment'
          
          // Change status to 'edited_draft' when admin edits draft timecard (requirement 3.4)
          if (timecard.status === 'draft') {
            updateData.status = 'edited_draft'
          }
        } else if (isOwner) {
          updateData.edit_type = 'user_correction'
        }
      }
    }

    // Determine action type for audit logging
    let actionType: 'user_edit' | 'admin_edit' | 'rejection_edit'
    if (returnToDraft) {
      actionType = 'rejection_edit' // Edit during return to draft is considered rejection edit
    } else if (updates.status === 'rejected') {
      actionType = 'rejection_edit' // Edit with rejection status is a rejection edit
    } else if (!isOwner && canApprove) {
      actionType = 'admin_edit'
    } else {
      actionType = 'user_edit'
    }

    // For rejection edits, we need to handle audit logging differently
    if (actionType === 'rejection_edit') {
      console.log('🔍 REJECTION EDIT DEBUG: Starting rejection edit audit logging')
      console.log('🔍 REJECTION EDIT DEBUG: timecardId:', timecardId)
      console.log('🔍 REJECTION EDIT DEBUG: updates:', JSON.stringify(updates, null, 2))
      console.log('🔍 REJECTION EDIT DEBUG: dailyUpdates:', JSON.stringify(dailyUpdates, null, 2))
      console.log('🔍 REJECTION EDIT DEBUG: user.id:', user.id)
      
      // Generate a unique change_id for this rejection interaction
      const changeId = crypto.randomUUID()
      const timestamp = new Date()
      
      console.log('🔍 REJECTION EDIT DEBUG: changeId:', changeId)
      console.log('🔍 REJECTION EDIT DEBUG: timestamp:', timestamp.toISOString())

      // Get current timecard data for comparison
      const { data: currentTimecard, error: fetchCurrentError } = await supabase
        .from('timecard_headers')
        .select('*')
        .eq('id', timecardId)
        .single()

      if (fetchCurrentError || !currentTimecard) {
        return NextResponse.json(
          { error: 'Failed to fetch current timecard data', code: 'FETCH_ERROR' },
          { status: 500 }
        )
      }

      // Get current daily entries for comparison
      const { data: currentDailyEntries, error: fetchDailyError } = await supabase
        .from('timecard_daily_entries')
        .select('*')
        .eq('timecard_header_id', timecardId)
        .order('work_date')

      if (fetchDailyError) {
        return NextResponse.json(
          { error: 'Failed to fetch current daily entries', code: 'FETCH_ERROR' },
          { status: 500 }
        )
      }

      // Apply the updates first
      const { error: updateError } = await supabase
        .from('timecard_headers')
        .update(updateData)
        .eq('id', timecardId)

      if (updateError) {
        console.error('Header update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update timecard header', code: 'UPDATE_ERROR' },
          { status: 500 }
        )
      }

      // Handle both desktop and mobile rejection formats
      const auditEntries: any[] = []
      
      // Check if we have desktop format (field IDs like "check_in_time_day_0") in updates
      const desktopFieldUpdates: Record<string, any> = {}
      const timeFieldPattern = /^(check_in_time|break_start_time|break_end_time|check_out_time)_day_(\d+)$/
      
      console.log('🔍 DESKTOP FORMAT DEBUG: Checking for desktop format fields in updates')
      console.log('🔍 DESKTOP FORMAT DEBUG: timeFieldPattern:', timeFieldPattern.toString())
      
      for (const [key, value] of Object.entries(updates)) {
        console.log('🔍 DESKTOP FORMAT DEBUG: Checking key:', key, 'value:', value)
        const match = key.match(timeFieldPattern)
        if (match) {
          const [, fieldType, dayIndex] = match
          desktopFieldUpdates[key] = { fieldType, dayIndex: parseInt(dayIndex), value }
          console.log('🔍 DESKTOP FORMAT DEBUG: Found desktop field:', key, 'fieldType:', fieldType, 'dayIndex:', dayIndex, 'value:', value)
        } else {
          console.log('🔍 DESKTOP FORMAT DEBUG: Key does not match pattern:', key)
        }
      }
      
      console.log('🔍 DESKTOP FORMAT DEBUG: desktopFieldUpdates:', JSON.stringify(desktopFieldUpdates, null, 2))

      // Process desktop format updates
      if (Object.keys(desktopFieldUpdates).length > 0) {
        console.log('🔍 DESKTOP FORMAT DEBUG: Processing desktop format updates')
        console.log('🔍 DESKTOP FORMAT DEBUG: Found', Object.keys(desktopFieldUpdates).length, 'desktop field updates')
        // Group by day index
        const dayUpdates: Record<number, Record<string, any>> = {}
        
        for (const [fieldId, { fieldType, dayIndex, value }] of Object.entries(desktopFieldUpdates)) {
          if (!dayUpdates[dayIndex]) {
            dayUpdates[dayIndex] = {}
          }
          dayUpdates[dayIndex][fieldType] = value
        }

        // Process each day's updates
        for (const [dayIndex, dayData] of Object.entries(dayUpdates)) {
          const dayIdx = parseInt(dayIndex.toString())
          
          // Find the current daily entry for this day
          console.log('🔍 DESKTOP DAILY ENTRY DEBUG: Looking for day', dayIdx)
          console.log('🔍 DESKTOP DAILY ENTRY DEBUG: currentDailyEntries:', currentDailyEntries?.map(e => ({ work_date: e.work_date, check_in_time: e.check_in_time })))
          
          const currentDayEntry = currentDailyEntries?.find(entry => {
            const entryDate = new Date(entry.work_date)
            const targetDate = new Date(currentTimecard.period_start_date)
            targetDate.setDate(targetDate.getDate() + dayIdx)
            console.log('🔍 DESKTOP DAILY ENTRY DEBUG: Comparing entryDate:', entryDate.toDateString(), 'vs targetDate:', targetDate.toDateString())
            return entryDate.toDateString() === targetDate.toDateString()
          })
          
          console.log('🔍 DESKTOP DAILY ENTRY DEBUG: Found currentDayEntry:', currentDayEntry ? { work_date: currentDayEntry.work_date, check_in_time: currentDayEntry.check_in_time } : 'null')

          if (currentDayEntry) {
            const workDate = new Date(currentDayEntry.work_date)

            // Check each field for changes and create audit entries
            // Field name mapping: database field -> audit log field name
            const fieldMappings = {
              'check_in_time': 'check_in',
              'break_start_time': 'break_start', 
              'break_end_time': 'break_end',
              'check_out_time': 'check_out'
            }

            for (const [fieldKey, fieldValue] of Object.entries(dayData)) {
              if (fieldValue !== undefined && fieldKey in fieldMappings) {
                const auditFieldName = fieldMappings[fieldKey as keyof typeof fieldMappings]
                const oldValue = currentDayEntry[fieldKey as keyof typeof currentDayEntry]
                
                console.log('🔍 DESKTOP AUDIT DEBUG: Processing field:', fieldKey, 'auditFieldName:', auditFieldName)
                console.log('🔍 DESKTOP AUDIT DEBUG: oldValue:', oldValue, 'fieldValue:', fieldValue)
                
                // Convert ISO string to time format for database storage
                let newValue = fieldValue
                if (typeof fieldValue === 'string' && fieldValue.includes('T')) {
                  // If it's an ISO string, extract just the time part
                  const date = new Date(fieldValue)
                  newValue = date.toTimeString().slice(0, 8)
                  console.log('🔍 DESKTOP AUDIT DEBUG: Converted ISO string to time:', newValue)
                } else if (typeof fieldValue === 'string' && fieldValue.match(/^\d{2}:\d{2}:\d{2}$/)) {
                  // If it's already in HH:MM:SS format, use as is
                  newValue = fieldValue
                  console.log('🔍 DESKTOP AUDIT DEBUG: Using time as-is:', newValue)
                }

                // Only create audit entry if values are actually different
                console.log('🔍 DESKTOP AUDIT DEBUG: Comparing oldValue:', oldValue, 'vs newValue:', newValue)
                console.log('🔍 DESKTOP AUDIT DEBUG: Values are different:', oldValue !== newValue)
                
                if (oldValue !== newValue) {
                  const auditEntry = {
                    timecard_id: timecardId,
                    change_id: changeId,
                    field_name: auditFieldName,
                    old_value: oldValue ? String(oldValue) : null,
                    new_value: newValue ? String(newValue) : null,
                    changed_by: user.id,
                    changed_at: timestamp.toISOString(),
                    action_type: 'rejection_edit',
                    work_date: workDate.toISOString().split('T')[0]
                  }
                  console.log('🔍 DESKTOP AUDIT DEBUG: Creating audit entry:', JSON.stringify(auditEntry, null, 2))
                  auditEntries.push(auditEntry)
                } else {
                  console.log('🔍 DESKTOP AUDIT DEBUG: Skipping audit entry - values are the same')
                }
              }
            }

            // Update the daily entry with converted values
            const updateData = {}
            for (const [fieldKey, fieldValue] of Object.entries(dayData)) {
              if (fieldValue !== undefined) {
                // Convert ISO string to time format for database storage
                let convertedValue = fieldValue
                if (typeof fieldValue === 'string' && fieldValue.includes('T')) {
                  const date = new Date(fieldValue)
                  convertedValue = date.toTimeString().slice(0, 8)
                }
                updateData[fieldKey] = convertedValue
              }
            }
            updateData['updated_at'] = new Date().toISOString()

            const { error: dailyUpdateError } = await supabase
              .from('timecard_daily_entries')
              .update(updateData)
              .eq('timecard_header_id', timecardId)
              .eq('work_date', workDate.toISOString().split('T')[0])

            if (dailyUpdateError) {
              console.error('Daily entry update error:', dailyUpdateError)
              return NextResponse.json(
                { error: `Failed to update daily entry for day ${dayIdx}`, code: 'UPDATE_ERROR' },
                { status: 500 }
              )
            }
          }
        }
      }

      // Process mobile format updates (dailyUpdates object)
      if (dailyUpdates && Object.keys(dailyUpdates).length > 0) {
        console.log('🔍 MOBILE FORMAT DEBUG: Processing mobile format updates')
        console.log('🔍 MOBILE FORMAT DEBUG: dailyUpdates:', JSON.stringify(dailyUpdates, null, 2))
        for (const [dayKey, dayData] of Object.entries(dailyUpdates)) {
          const dayIndex = parseInt(dayKey.replace('day_', ''))
          
          // Find the current daily entry for this day
          const currentDayEntry = currentDailyEntries?.find(entry => {
            const entryDate = new Date(entry.work_date)
            const targetDate = new Date(currentTimecard.period_start_date)
            targetDate.setDate(targetDate.getDate() + dayIndex)
            return entryDate.toDateString() === targetDate.toDateString()
          })

          if (currentDayEntry) {
            const workDate = new Date(currentDayEntry.work_date)

            // Check each field for changes and create audit entries
            // Field name mapping: database field -> audit log field name
            const fieldMappings = {
              'check_in_time': 'check_in',
              'break_start_time': 'break_start', 
              'break_end_time': 'break_end',
              'check_out_time': 'check_out'
            }

            for (const [fieldKey, fieldValue] of Object.entries(dayData)) {
              if (fieldValue !== undefined && fieldKey in fieldMappings) {
                const auditFieldName = fieldMappings[fieldKey as keyof typeof fieldMappings]
                const oldValue = currentDayEntry[fieldKey as keyof typeof currentDayEntry]
                const newValue = fieldValue

                // Only create audit entry if values are actually different
                if (oldValue !== newValue) {
                  auditEntries.push({
                    timecard_id: timecardId,
                    change_id: changeId,
                    field_name: auditFieldName,
                    old_value: oldValue ? String(oldValue) : null,
                    new_value: newValue ? String(newValue) : null,
                    changed_by: user.id,
                    changed_at: timestamp.toISOString(),
                    action_type: 'rejection_edit',
                    work_date: workDate.toISOString().split('T')[0]
                  })
                }
              }
            }

            // Update the daily entry
            const { error: dailyUpdateError } = await supabase
              .from('timecard_daily_entries')
              .update({
                ...dayData,
                updated_at: new Date().toISOString(),
              })
              .eq('timecard_header_id', timecardId)
              .eq('work_date', new Date(new Date(currentTimecard.period_start_date).getTime() + dayIndex * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

            if (dailyUpdateError) {
              console.error('Daily entry update error:', dailyUpdateError)
              return NextResponse.json(
                { error: `Failed to update daily entry for day ${dayIndex}`, code: 'UPDATE_ERROR' },
                { status: 500 }
              )
            }
          }
        }
      }

      // Insert all audit entries if any changes were made
      console.log('🔍 AUDIT INSERT DEBUG: auditEntries.length:', auditEntries.length)
      console.log('🔍 AUDIT INSERT DEBUG: auditEntries:', JSON.stringify(auditEntries, null, 2))
      
      if (auditEntries.length > 0) {
        console.log('🔍 AUDIT INSERT DEBUG: Inserting', auditEntries.length, 'audit entries')
        const { error: auditError } = await supabase
          .from('timecard_audit_log')
          .insert(auditEntries)

        if (auditError) {
          console.error('❌ AUDIT INSERT ERROR:', auditError)
          // Don't fail the request for audit log errors, just log them
        } else {
          console.log('✅ AUDIT INSERT SUCCESS: Inserted', auditEntries.length, 'audit entries')
        }
      } else {
        console.log('⚠️ AUDIT INSERT DEBUG: No audit entries to insert')
      }
    } else {
      // For non-rejection edits, use the existing audit logging system
      const auditContext: TimecardAuditContext = {
        timecardId,
        userId: user.id,
        actionType,
        workDate: new Date(timecard.period_start_date)
      }

      // Apply the updates with audit logging
      await withTimecardAuditLogging(
        supabase,
        auditContext,
        async () => {
          // Update timecard header
          const { error: updateError } = await supabase
            .from('timecard_headers')
            .update(updateData)
            .eq('id', timecardId)

          if (updateError) {
            console.error('Header update error:', updateError)
            throw new Error('Failed to update timecard header')
          }

          // Update daily entries if provided
          if (dailyUpdates && Object.keys(dailyUpdates).length > 0) {
            for (const [dayKey, dayData] of Object.entries(dailyUpdates)) {
              const dayIndex = parseInt(dayKey.replace('day_', ''))
              
              const { error: dailyUpdateError } = await supabase
                .from('timecard_daily_entries')
                .update({
                  ...dayData,
                  updated_at: new Date().toISOString(),
                })
                .eq('timecard_header_id', timecardId)
                .eq('work_date', new Date(new Date(timecard.period_start_date).getTime() + dayIndex * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

              if (dailyUpdateError) {
                console.error('Daily entry update error:', dailyUpdateError)
                throw new Error(`Failed to update daily entry for day ${dayIndex}`)
              }
            }
          }

          return true
        }
      )
    }

    // Create status change audit log if status changed to 'edited_draft' (requirement 3.4)
    if (updateData.status === 'edited_draft' && timecard.status === 'draft') {
      try {
        const auditLogService = new AuditLogService(supabase)
        await auditLogService.logStatusChange(
          timecardId,
          'draft',
          'edited_draft',
          user.id
        )
      } catch (auditError) {
        console.error('Failed to create status change audit log for edited_draft:', auditError)
        // Don't fail the edit if audit logging fails, but log the error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Timecard updated successfully'
    })

  } catch (error) {
    console.error('Timecard edit error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}