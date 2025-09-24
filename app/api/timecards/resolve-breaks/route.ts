import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { resolveTimecardBreaks } from "@/lib/timecard-validation"

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
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { timecardIds, resolutions } = body

    if (!timecardIds || !Array.isArray(timecardIds) || !resolutions) {
      return NextResponse.json(
        { error: "Invalid request data", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    // Fetch the timecards that need resolution
    const { data: timecards, error: fetchError } = await supabase
      .from("timecard_headers")
      .select("*")
      .in("id", timecardIds)
      .eq("user_id", user.id) // Ensure user can only resolve their own timecards
      .eq("status", "draft") // Only allow resolution of draft timecards

    if (fetchError) {
      console.error("Error fetching timecards:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch timecards", code: "DATABASE_ERROR" },
        { status: 500 }
      )
    }

    if (!timecards || timecards.length === 0) {
      return NextResponse.json(
        { error: "No valid timecards found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    // Generate break resolution updates
    const updates = resolveTimecardBreaks(timecards, resolutions)

    // Apply updates to database
    const updatePromises = updates.map(async (update) => {
      const updateData: any = {
        break_duration: update.break_duration,
        total_hours: update.total_hours,
        total_pay: update.total_pay,
        updated_at: new Date().toISOString(),
      }

      // Only include break times if they are defined (not undefined)
      if (update.break_start_time !== undefined) {
        updateData.break_start_time = update.break_start_time
      }
      if (update.break_end_time !== undefined) {
        updateData.break_end_time = update.break_end_time
      }

      const { error } = await supabase
        .from("timecard_headers")
        .update(updateData)
        .eq("id", update.id)
        .eq("user_id", user.id) // Double-check ownership

      if (error) {
        console.error(`Error updating timecard ${update.id}:`, error)
        throw error
      }

      return update.id
    })

    const updatedIds = await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      updatedTimecards: updatedIds,
      message: `Successfully resolved breaks for ${updatedIds.length} timecard(s)`
    })

  } catch (error) {
    console.error("Error resolving breaks:", error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}