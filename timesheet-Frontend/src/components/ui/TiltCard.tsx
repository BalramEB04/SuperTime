import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../lib/utils";

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxRotation?: number;
  children: React.ReactNode;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  maxRotation = 8,
  className,
  children,
  ...props
}) => {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (shouldReduceMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -maxRotation;
      const rotateY = ((x - centerX) / centerX) * maxRotation;

      setRotation({ x: rotateX, y: rotateY });
    },
    [maxRotation, shouldReduceMotion]
  );

  const handleMouseLeave = React.useCallback(() => {
    setRotation({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  return (
    <div style={{ perspective: 1000 }} className="inline-block w-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        animate={
          shouldReduceMotion
            ? {}
            : {
                rotateX: rotation.x,
                rotateY: rotation.y,
                scale: isHovered ? 1.015 : 1,
              }
        }
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        style={{ transformStyle: "preserve-3d" }}
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-surface/90 p-6 backdrop-blur-md transition-shadow",
          isHovered ? "shadow-xl border-primary/40" : "shadow-sm",
          className
        )}
        {...(props as any)}
      >
        <div style={{ transform: "translateZ(20px)" }}>{children}</div>
      </motion.div>
    </div>
  );
};
