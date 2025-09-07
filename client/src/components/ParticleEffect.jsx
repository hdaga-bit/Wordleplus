import React, { useEffect, useState } from "react";

export default function ParticleEffect({
  trigger,
  type = "wordComplete",
  position = { x: 0, y: 0 },
  className = "",
}) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!trigger) return;

    const createParticles = () => {
      const particleCount = type === "wordComplete" ? 20 : 50;
      const newParticles = [];

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 2 + Math.random() * 3;
        const size = 3 + Math.random() * 4;
        const color =
          type === "wordComplete"
            ? ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"][
                Math.floor(Math.random() * 4)
              ]
            : [
                "#ef4444",
                "#f97316",
                "#eab308",
                "#22c55e",
                "#06b6d4",
                "#8b5cf6",
              ][Math.floor(Math.random() * 6)];

        newParticles.push({
          id: i,
          x: position.x,
          y: position.y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size,
          color,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.01,
        });
      }

      setParticles(newParticles);
    };

    createParticles();
  }, [trigger, type, position]);

  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles((prevParticles) => {
        const updated = prevParticles
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vx: particle.vx * 0.98, // Friction
            vy: particle.vy * 0.98 + 0.1, // Gravity
            life: particle.life - particle.decay,
          }))
          .filter((particle) => particle.life > 0);

        return updated;
      });
    };

    const interval = setInterval(animate, 16); // 60fps
    return () => clearInterval(interval);
  }, [particles.length]);

  if (particles.length === 0) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.life,
            transform: `translate(-50%, -50%) scale(${particle.life})`,
            transition: "opacity 0.1s ease-out",
          }}
        />
      ))}
    </div>
  );
}
