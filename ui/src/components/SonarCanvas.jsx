import React, { useRef, useEffect } from 'react';

/**
 * U2 AUDIT:
 * - Real-time canvas rendering for YOLOv11 side-scan sonar feeds.
 * - Enforces requestAnimationFrame cleanup to prevent memory leaks.
 * - Prevents stale state closures when rendering bounding boxes.
 */
export default function SonarCanvas({ frameData, boundingBoxes }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Use a ref to keep the latest props without re-triggering the effect unnecessarily
  const currentDrawState = useRef({ frameData, boundingBoxes });

  useEffect(() => {
    currentDrawState.current = { frameData, boundingBoxes };
  }, [frameData, boundingBoxes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency needed in background
    let isMounted = true;

    const draw = () => {
      if (!isMounted) return;

      const { frameData, boundingBoxes } = currentDrawState.current;
      
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // In a real scenario, frameData would be an ImageBitmap or ImageData
      // We simulate drawing the mock YOLOv11 boxes
      if (boundingBoxes && boundingBoxes.length > 0) {
        ctx.strokeStyle = '#ff0055'; // High contrast red for debris/anomalies
        ctx.lineWidth = 2;
        ctx.font = '14px Arial';

        boundingBoxes.forEach((box) => {
          ctx.beginPath();
          ctx.rect(box.x, box.y, box.width, box.height);
          ctx.stroke();
          
          ctx.fillStyle = '#ff0055';
          ctx.fillText(`${box.label} (${(box.confidence * 100).toFixed(0)}%)`, box.x, box.y > 20 ? box.y - 5 : box.y + 20);
        });
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    // Start render loop
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      isMounted = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={600} 
      style={{ 
        width: '100%', 
        height: 'auto', 
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }} 
    />
  );
}
