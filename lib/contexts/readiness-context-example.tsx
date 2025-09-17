'use client';

import React from 'react';
import { ReadinessProvider, useReadiness } from './readiness-context';
import { useCachedFeatureAvailability } from '../../hooks/use-cached-feature-availability';

// Example component that uses the readiness context
const ProjectFeatureStatus: React.FC = () => {
  const { readiness, isLoading, error } = useReadiness();
  const featureAvailability = useCachedFeatureAvailability();

  if (isLoading) {
    return <div>Loading project readiness...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!readiness) {
    return <div>No readiness data available</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Project Status: {readiness.status}</h3>
        <p>Last calculated: {new Date(readiness.calculated_at).toLocaleString()}</p>
      </div>

      <div>
        <h4 className="font-medium">Feature Availability:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Team Management: {featureAvailability.canManageTeam ? '✅' : '❌'}</li>
          <li>Talent Tracking: {featureAvailability.canTrackTalent ? '✅' : '❌'}</li>
          <li>Scheduling: {featureAvailability.canSchedule ? '✅' : '❌'}</li>
          <li>Time Tracking: {featureAvailability.canTrackTime ? '✅' : '❌'}</li>
        </ul>
      </div>

      {featureAvailability.blockingIssues.length > 0 && (
        <div>
          <h4 className="font-medium text-red-600">Blocking Issues:</h4>
          <ul className="list-disc list-inside space-y-1">
            {featureAvailability.blockingIssues.map((issue, index) => (
              <li key={index} className="text-red-600">{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {featureAvailability.nextSteps.length > 0 && (
        <div>
          <h4 className="font-medium text-blue-600">Next Steps:</h4>
          <ul className="list-disc list-inside space-y-1">
            {featureAvailability.nextSteps.map((step, index) => (
              <li key={index} className="text-blue-600">{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Example of how to wrap a project layout with the ReadinessProvider
interface ProjectLayoutWithReadinessProps {
  projectId: string;
  initialReadiness?: any;
  children: React.ReactNode;
}

export const ProjectLayoutWithReadiness: React.FC<ProjectLayoutWithReadinessProps> = ({
  projectId,
  initialReadiness,
  children
}) => {
  return (
    <ReadinessProvider projectId={projectId} initialReadiness={initialReadiness}>
      <div className="project-layout">
        <div className="project-sidebar">
          <ProjectFeatureStatus />
        </div>
        <div className="project-content">
          {children}
        </div>
      </div>
    </ReadinessProvider>
  );
};

export default ProjectLayoutWithReadiness;