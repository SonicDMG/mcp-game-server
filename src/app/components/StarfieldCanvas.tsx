import React, { useRef, useEffect } from 'react';

// DEBUG: Make stars large and numerous for visibility
const STAR_MIN_SPEED = 0.05;
const STAR_MAX_SPEED = 0.15;
const STAR_MIN_RADIUS = 0.5;
const STAR_MAX_RADIUS = 2.5;

interface StarfieldCanvasProps {
  width?: number;
  height?: number;
  numStars?: number;
  centerX?: number;
  centerY?: number;
  style?: React.CSSProperties;
}

const StarfieldCanvas: React.FC<StarfieldCanvasProps> = ({
  width = 1200,
  height = 220,
  numStars = 80,
  centerX,
  centerY,
  style,
}) => {
  const cx = centerX !== undefined ? centerX : width / 2;
  const cy = centerY !== undefined ? centerY : height / 2;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useRef(
    Array.from({ length: numStars }, () => {
      const angle = Math.random() * 2 * Math.PI;
      const speed = STAR_MIN_SPEED + Math.random() * (STAR_MAX_SPEED - STAR_MIN_SPEED);
      const radius = STAR_MIN_RADIUS + Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS);
      return {
        x: cx,
        y: cy,
        angle,
        speed,
        radius,
      };
    })
  );
  useEffect(() => {
    let animationId: number;
    const ctx = canvasRef.current?.getContext('2d');
    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const star of stars.current) {
        star.x += Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;
        if (
          star.x < 0 || star.x > width ||
          star.y < 0 || star.y > height
        ) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = STAR_MIN_SPEED + Math.random() * (STAR_MAX_SPEED - STAR_MIN_SPEED);
          const radius = STAR_MIN_RADIUS + Math.random() * (STAR_MAX_RADIUS - STAR_MIN_RADIUS);
          star.x = cx;
          star.y = cy;
          star.angle = angle;
          star.speed = speed;
          star.radius = radius;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      animationId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [width, height, cx, cy, numStars]);
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height,
        opacity: 0.18,
        zIndex: 0,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};

export default StarfieldCanvas; 