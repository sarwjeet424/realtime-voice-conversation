import React, { useState, useEffect } from 'react';

interface Avatar3DProps {
  isSpeaking: boolean;
  emotion?: 'happy' | 'sad' | 'angry' | 'excited' | 'calm' | 'confused' | 'neutral';
  audioLevel?: number;
}

export default function Avatar3D({ isSpeaking, emotion, audioLevel }: Avatar3DProps) {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setAnimationPhase(prev => (prev + 1) % 4);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isSpeaking]);

  // Get color based on emotion
  const getEmotionColor = () => {
    switch (emotion) {
      case 'happy': return '#FFD700';
      case 'sad': return '#87CEEB';
      case 'angry': return '#FF6B6B';
      case 'excited': return '#FF8C00';
      case 'calm': return '#98FB98';
      case 'confused': return '#DDA0DD';
      default: return '#E6E6FA';
    }
  };

  const getEmotionEmoji = () => {
    switch (emotion) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'angry': return '😠';
      case 'excited': return '🤩';
      case 'calm': return '😌';
      case 'confused': return '😕';
      default: return '😐';
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      {/* 3D-like Avatar using CSS */}
      <div 
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${getEmotionColor()}, ${getEmotionColor()}88)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          transform: isSpeaking ? `scale(${1 + Math.sin(animationPhase) * 0.1})` : 'scale(1)',
          transition: 'all 0.3s ease',
          boxShadow: `0 0 30px ${getEmotionColor()}40`,
          border: `3px solid ${getEmotionColor()}`,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {getEmotionEmoji()}
        
        {/* Speaking indicator */}
        {isSpeaking && (
          <div
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#00FF88',
              animation: 'pulse 1s infinite'
            }}
          />
        )}
      </div>

      {/* Sound waves */}
      {isSpeaking && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: `${60 + i * 20}px`,
                height: `${60 + i * 20}px`,
                border: `2px solid ${getEmotionColor()}`,
                borderRadius: '50%',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: `ripple ${1 + i * 0.5}s infinite`,
                opacity: 0.6 - i * 0.2
              }}
            />
          ))}
        </div>
      )}

      {/* Floating particles */}
      {isSpeaking && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '4px',
                height: '4px',
                background: getEmotionColor(),
                borderRadius: '50%',
                left: `${20 + i * 10}%`,
                top: `${30 + (i % 3) * 20}%`,
                animation: `float ${2 + i * 0.3}s infinite ease-in-out`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      )}

    </div>
  );
}
