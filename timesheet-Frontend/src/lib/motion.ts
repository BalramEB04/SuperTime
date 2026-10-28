import { type Variants, type Transition } from "motion/react";

/**
 * Standard physics-based spring for dialogs, popovers, and interactive surfaces.
 */
export const springTransition: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
};

/**
 * Smooth cubic easing for slide and fade transitions.
 */
export const smoothTransition: Transition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

/**
 * Fast micro-interaction transition for buttons, badges, and toggles.
 */
export const microTransition: Transition = {
  duration: 0.12,
  ease: "easeOut",
};

/**
 * Modal dialog overlay and content animation variants.
 */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Staggered list container & child item variants.
 */
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};
