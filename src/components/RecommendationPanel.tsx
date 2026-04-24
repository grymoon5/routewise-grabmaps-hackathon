import React from 'react';
import { Zone } from '../lib/supplyModel';

interface RecommendationPanelProps {
  selectedZone: Zone | null;
  currentHour: number;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  selectedZone,
  currentHour
}) => {
  if (!selectedZone) {
    return (
      <div style={{ padding: '20px', background: '#f5f5f5' }}>
        <h3>Supply Recommendations</h3>
        <p>Click on a zone to see supply information and recommendations.</p>
      </div>
    );
  }

  const supply = selectedZone.supplyScores[currentHour];
  const supplyLevel = supply < 40 ? 'Low' : supply < 70 ? 'Medium' : 'High';
  const waitTime = supply < 40 ? 38 : supply < 70 ? 20 : 10;

  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h3>{selectedZone.name} Zone</h3>

      <div style={{ margin: '10px 0' }}>
        <strong>Supply Level:</strong> {supplyLevel} ({supply}/100)
      </div>

      <div style={{ margin: '10px 0' }}>
        <strong>Estimated Wait:</strong> {waitTime} minutes
      </div>

      <div style={{ margin: '10px 0' }}>
        <strong>Safety Score:</strong> {selectedZone.safetyScore}/100
      </div>

      <div style={{ margin: '10px 0' }}>
        <strong>Reason:</strong> {selectedZone.explanation}
      </div>

      {supplyLevel === 'Low' && (
        <div style={{ margin: '15px 0', padding: '10px', background: '#ffebee', borderRadius: '5px' }}>
          <strong>Recommendation:</strong> Consider alternative pickup zones with higher supply during this hour.
        </div>
      )}

      {supplyLevel === 'High' && (
        <div style={{ margin: '15px 0', padding: '10px', background: '#e8f5e8', borderRadius: '5px' }}>
          <strong>Recommendation:</strong> This zone has excellent supply - optimal for quick pickups!
        </div>
      )}
    </div>
  );
};