'use client';

import { useEffect, useRef } from 'react';

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
}

export function SnowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flakesRef = useRef<Flake[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const maxFlakes = 100;

    // Initialize flakes
    const createFlake = (): Flake => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 4 + 2,
      speed: Math.random() * 1 + 0.5,
    });

    flakesRef.current = Array.from({ length: maxFlakes }, createFlake);

    const drawSnow = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'white';

      flakesRef.current.forEach((flake) => {
        ctx.fillRect(flake.x, flake.y, flake.size, flake.size);
      });
    };

    const updateSnow = () => {
      flakesRef.current.forEach((flake) => {
        flake.y += flake.speed;
        flake.x += Math.sin(flake.y * 0.01) * 0.5;

        if (flake.y > height) {
          flake.y = -5;
          flake.x = Math.random() * width;
        }
      });
    };

    const loop = () => {
      drawSnow();
      updateSnow();
      animationRef.current = requestAnimationFrame(loop);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    loop();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="snowCanvas"
      className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none"
    />
  );
}
