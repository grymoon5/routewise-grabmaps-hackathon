import React from 'react';

interface ScenarioControlsProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  currentHour,
  onHourChange,
  isPlaying,
  onPlayPause
}) => {
  const formatHour = (hour: number) => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'white',
      padding: '15px',
      borderRadius: '50%',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      width: '200px',
      height: '200px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          {formatHour(currentHour)}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Supply Forecast
        </div>
      </div>

      <input
        type="range"
        min="0"
        max="23"
        value={currentHour}
        onChange={(e) => onHourChange(parseInt(e.target.value))}
        style={{
          width: '80%',
          margin: '10px 0',
          transform: 'rotate(-90deg)',
          transformOrigin: 'center'
        }}
      />

      <button
        onClick={onPlayPause}
        style={{
          background: isPlaying ? '#ff4444' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px'
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
        {isPlaying ? 'Pause' : 'Play'} Timeline
      </div>
    </div>
  );
};