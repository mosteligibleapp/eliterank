import React from 'react';
import { Crown } from 'lucide-react';
import { colors } from '../../styles/theme';

/**
 * Animated icon showing 5 crowns funneling inward
 * Represents "elites gathering" for events
 */
export function EliteGatheringIcon({ size = 64, crownSize = 12 }) {
  // 5 positions arranged in a circle, will animate toward center
  const positions = [
    { angle: 0, delay: 0 },      // Top
    { angle: 72, delay: 0.1 },   // Top-right
    { angle: 144, delay: 0.2 },  // Bottom-right
    { angle: 216, delay: 0.3 },  // Bottom-left
    { angle: 288, delay: 0.4 },  // Top-left
  ];

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* CSS Keyframes */}
      <style>
        {`
          @keyframes crownFunnel {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0.4;
            }
            50% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(0.6);
              opacity: 0.3;
            }
          }

          @keyframes crownOrbit {
            0% {
              transform: rotate(0deg) translateX(${size * 0.35}px) rotate(0deg);
            }
            100% {
              transform: rotate(360deg) translateX(${size * 0.35}px) rotate(-360deg);
            }
          }

          @keyframes crownGather {
            0%, 100% {
              transform: translate(-50%, -50%) translateX(var(--start-x)) translateY(var(--start-y)) scale(0.7);
              opacity: 0.5;
            }
            50% {
              transform: translate(-50%, -50%) translateX(0) translateY(0) scale(1);
              opacity: 1;
            }
          }

          @keyframes pulseCenter {
            0%, 100% {
              transform: translate(-50%, -50%) scale(0.9);
              opacity: 0.7;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.1);
              opacity: 1;
            }
          }
        `}
      </style>

      {/* Central crown (destination) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'pulseCenter 2s ease-in-out infinite',
        }}
      >
        <Crown
          size={crownSize * 1.5}
          style={{
            color: colors.gold.primary,
            filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.6))',
          }}
        />
      </div>

      {/* 5 orbiting/gathering crowns */}
      {positions.map((pos, index) => {
        const radian = (pos.angle * Math.PI) / 180;
        const startX = Math.sin(radian) * (size * 0.35);
        const startY = -Math.cos(radian) * (size * 0.35);

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              '--start-x': `${startX}px`,
              '--start-y': `${startY}px`,
              animation: `crownGather 2.5s ease-in-out infinite`,
              animationDelay: `${pos.delay}s`,
            }}
          >
            <Crown
              size={crownSize}
              style={{
                color: '#fff',
                opacity: 0.9,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default EliteGatheringIcon;
