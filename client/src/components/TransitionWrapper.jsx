import React, { useState, useEffect } from "react";

export default function TransitionWrapper({
  children,
  show,
  transitionClass = "fade",
  duration = 500,
  onTransitionEnd,
}) {
  const [isVisible, setIsVisible] = useState(show);
  const [transitionState, setTransitionState] = useState(
    show ? "enter-active" : "exit"
  );

  useEffect(() => {
    if (show && !isVisible) {
      // Entering
      setIsVisible(true);
      setTransitionState("enter");

      // Force reflow to ensure enter class is applied
      requestAnimationFrame(() => {
        setTransitionState("enter-active");
      });
    } else if (!show && isVisible) {
      // Exiting
      setTransitionState("exit-active");

      const timer = setTimeout(() => {
        setIsVisible(false);
        setTransitionState("exit");
        onTransitionEnd?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, isVisible, duration, onTransitionEnd]);

  if (!isVisible) return null;

  return (
    <div
      className={`${transitionClass}-${transitionState}`}
      style={{
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}
