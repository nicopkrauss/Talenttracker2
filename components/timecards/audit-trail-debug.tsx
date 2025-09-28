"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AuditTrailDebugProps {
  timecardId: string
}

export function AuditTrailDebug({ timecardId }: AuditTrailDebugProps) {
  const [data, setData] = useState<any[]>([])
  const [rawResponse, setRawResponse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Fetching audit logs for timecard:', timecardId)
        
        const response = await fetch(`/api/timecards/${timecardId}/audit-logs?limit=10&offset=0&grouped=false`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch')
        }

        const result = await response.json()
        console.log('📊 Full API Response:', result)
        console.log('📊 Data array:', result.data)
        console.log('📊 Data length:', result.data?.length)
        
        if (result.data && result.data.length > 0) {
          console.log('📊 First entry raw:', result.data[0])
          console.log('📊 First entry keys:', Object.keys(result.data[0]))
          console.log('📊 First entry id:', result.data[0].id)
          console.log('📊 First entry field_name:', result.data[0].field_name)
        }
        
        setRawResponse(result)
        setData(result.data || [])
        setLoading(false)
      } catch (err) {
        console.error('❌ Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    fetchData()
  }, [timecardId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debug: Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Debug: Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Error: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug: Audit Trail ({data.length} entries)</CardTitle>
      </CardHeader>
      <CardContent>
        {rawResponse && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
            <strong>Raw API Response:</strong>
            <pre className="mt-1 overflow-x-auto">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        )}
        
        {data.length === 0 ? (
          <p>No audit logs found</p>
        ) : (
          <div className="space-y-2">
            {data.map((entry, index) => (
              <div key={`debug-${index}`} className="p-2 border rounded">
                <div className="text-sm">
                  <strong>Entry {index + 1}:</strong>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  <div>ID: {entry.id || 'No ID'}</div>
                  <div>Field: "{entry.field_name || 'No field name'}"</div>
                  <div>Action: {entry.action_type || 'No action type'}</div>
                  <div>Old: {entry.old_value || 'null'}</div>
                  <div>New: {entry.new_value || 'null'}</div>
                  <div>Changed by: {entry.changed_by_profile?.full_name || entry.changed_by || 'Unknown'}</div>
                  <div>Changed at: {entry.changed_at || 'No date'}</div>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  <strong>All keys:</strong> {Object.keys(entry).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}