import { TimeTrackingDemo } from '@/components/timecards/time-tracking-demo'

export default function TestTimeTrackingPage() {
  // Mock project ID for testing
  const mockProjectId = 'test-project-123'

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Time Tracking Hook Demo</h1>
        <p className="text-gray-600 mt-2">
          Test the useTimeTracking hook with different user roles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-center">Talent Escort</h2>
          <TimeTrackingDemo 
            projectId={mockProjectId}
            userRole="talent_escort"
            scheduledStartTime="9:00 AM"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-center">Supervisor</h2>
          <TimeTrackingDemo 
            projectId={mockProjectId}
            userRole="supervisor"
            scheduledStartTime="8:30 AM"
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-center">Coordinator</h2>
          <TimeTrackingDemo 
            projectId={mockProjectId}
            userRole="coordinator"
            scheduledStartTime="8:00 AM"
          />
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Hook Features Demonstrated:</h3>
        <ul className="space-y-2 text-sm">
          <li>✅ State machine logic (checked_out → checked_in → on_break → break_ended → checked_out)</li>
          <li>✅ Role-specific break durations (30 min for escorts, 60 min for staff)</li>
          <li>✅ Break duration enforcement with grace period logic</li>
          <li>✅ Role-specific workflow (escorts complete after break, supervisors can check out)</li>
          <li>✅ Overtime detection and warnings</li>
          <li>✅ 20-hour shift limit monitoring</li>
          <li>✅ Real-time contextual information</li>
          <li>✅ Database persistence via API endpoints</li>
          <li>✅ State restoration from existing timecard records</li>
          <li>✅ Error handling and loading states</li>
        </ul>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Testing Instructions:</h3>
        <ol className="space-y-2 text-sm">
          <li>1. Click "Check In" to start a shift</li>
          <li>2. Click "Start My Break" to begin break (note the timer)</li>
          <li>3. Try to end break before minimum duration (button disabled)</li>
          <li>4. Wait for minimum duration or use browser dev tools to advance time</li>
          <li>5. Click "End My Break" to complete break</li>
          <li>6. For supervisors/coordinators: Click "Check Out" to finish shift</li>
          <li>7. For escorts: Workflow completes automatically after break</li>
          <li>8. Refresh page to test state restoration</li>
        </ol>
      </div>
    </div>
  )
}