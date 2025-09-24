import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { validateTimecardSubmission } from "@/lib/timecard-validation"

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
    const { timecardIds, projectId } = body

    if (!timecardIds || !Array.isArray(timecardIds)) {
      return NextResponse.json(
        { error: "Invalid request data", code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    // Fetch the timecards to validate
    const { data: timecards, error: fetchError } = await supabase
      .from("timecard_headers")
      .select("*")
      .in("id", timecardIds)
      .eq("user_id", user.id) // Ensure user can only validate their own timecards

    if (fetchError) {
      console.error("Error fetching timecards:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch timecards", code: "DATABASE_ERROR" },
        { status: 500 }
      )
    }

    if (!timecards || timecards.length === 0) {
      return NextResponse.json(
        { error: "No timecards found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    // Fetch project information for show day validation if projectId is provided
    let projectStartDate: string | undefined
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("start_date")
        .eq("id", projectId)
        .single()

      if (projectError) {
        console.error("Error fetching project:", projectError)
        // Continue without project validation if project not found
      } else {
        projectStartDate = project.start_date
      }
    }

    // Validate the timecards
    const validation = validateTimecardSubmission(timecards, projectStartDate)

    return NextResponse.json({
      canSubmit: validation.canSubmit,
      missingBreaks: validation.missingBreaks,
      errors: validation.errors,
      message: validation.canSubmit 
        ? "Timecards are ready for submission" 
        : "Timecards have validation issues that must be resolved"
    })

  } catch (error) {
    console.error("Error validating timecard submission:", error)
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