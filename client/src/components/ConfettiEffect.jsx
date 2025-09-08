import React, { useEffect, useState } from "react";

export default function ConfettiEffect({ trigger, className = "" }) {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (!trigger) return;

    const createConfetti = () => {
      const confettiCount = 100;
      const newConfetti = [];

      for (let i = 0; i < confettiCount; i++) {
        const colors = [
          "#ef4444",
          "#f97316",
          "#eab308",
          "#22c55e",
          "#06b6d4",
          "#8b5cf6",
          "#ec4899",
        ];
        const shapes = ["square", "circle", "triangle"];

        newConfetti.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: -10,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 3 + 2,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          size: 8 + Math.random() * 8,
          life: 1.0,
          decay: 0.005,
        });
      }

      setConfetti(newConfetti);
    };

    createConfetti();
  }, [trigger]);

  useEffect(() => {
    if (confetti.length === 0) return;

    const animate = () => {
      setConfetti((prevConfetti) => {
        const updated = prevConfetti
          .map((item) => ({
            ...item,
            x: item.x + item.vx,
            y: item.y + item.vy,
            rotation: item.rotation + item.rotationSpeed,
            vy: item.vy + 0.1, // Gravity
            life: item.life - item.decay,
          }))
          .filter((item) => item.life > 0 && item.y < window.innerHeight + 50);

        return updated;
      });
    };

    const interval = setInterval(animate, 16); // 60fps
    return () => clearInterval(interval);
  }, [confetti.length]);

  if (confetti.length === 0) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 ${className}`}>
      {confetti.map((item) => (
        <div
          key={item.id}
          className="absolute"
          style={{
            left: item.x,
            top: item.y,
            width: item.size,
            height: item.size,
            backgroundColor: item.color,
            opacity: item.life,
            transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
            borderRadius:
              item.shape === "circle"
                ? "50%"
                : item.shape === "triangle"
                ? "0"
                : "2px",
            clipPath:
              item.shape === "triangle"
                ? "polygon(50% 0%, 0% 100%, 100% 100%)"
                : "none",
            transition: "opacity 0.1s ease-out",
          }}
        />
      ))}
    </div>
  );
}
