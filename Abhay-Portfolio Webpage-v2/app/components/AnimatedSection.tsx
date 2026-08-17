"use client";

import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

// Ultra-smooth easing curve
export const smoothEase = [0.16, 1, 0.3, 1] as const;

// Curtain reveal - slides up from below with opacity
export const curtainReveal: Variants = {
  hidden: { 
    opacity: 0, 
    y: 80,
    scale: 0.96,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.9,
      ease: smoothEase,
    },
  },
};

// Pop up reveal - bounces up with scale
export const popUpReveal: Variants = {
  hidden: { 
    opacity: 0, 
    y: 60,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: smoothEase,
    },
  },
};

// Slide in from side
export const slideInLeft: Variants = {
  hidden: { 
    opacity: 0, 
    x: -60,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: smoothEase,
    },
  },
};

export const slideInRight: Variants = {
  hidden: { 
    opacity: 0, 
    x: 60,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      ease: smoothEase,
    },
  },
};

// Fade in with blur
export const blurFadeIn: Variants = {
  hidden: { 
    opacity: 0, 
    filter: "blur(8px)",
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    transition: {
      duration: 1,
      ease: smoothEase,
    },
  },
};

// Stagger container for children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

// Fast stagger for tighter groups
export const fastStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// Child item for stagger
export const staggerItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 40,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: smoothEase,
    },
  },
};

// Card hover effect
export const cardHover = {
  scale: 1.03,
  y: -8,
  transition: {
    duration: 0.4,
    ease: smoothEase,
  },
};

// Icon spin on hover
export const iconSpin = {
  rotate: 360,
  scale: 1.2,
  transition: {
    duration: 0.6,
    ease: smoothEase,
  },
};

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "curtain" | "popUp" | "slideLeft" | "slideRight" | "blurFade";
}

export function AnimatedSection({
  children,
  className = "",
  delay = 0,
  variant = "curtain",
}: AnimatedSectionProps) {
  const variants = {
    curtain: curtainReveal,
    popUp: popUpReveal,
    slideLeft: slideInLeft,
    slideRight: slideInRight,
    blurFade: blurFadeIn,
  };

  const selectedVariant = variants[variant];

  return (
    <motion.div
      variants={selectedVariant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "-80px" }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className = "",
  fast = false,
}: {
  children: ReactNode;
  className?: string;
  fast?: boolean;
}) {
  return (
    <motion.div
      variants={fast ? fastStagger : staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "-50px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Wrapper component that adds hover effects to any card
export function AnimatedCard({
  children,
  className = "",
  hoverScale = 1.03,
  hoverY = -8,
}: {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
}) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ 
        scale: hoverScale, 
        y: hoverY,
        transition: { duration: 0.4, ease: smoothEase }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Text reveal animation - character by character or word by word
export function TextReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: false }}
      transition={{ duration: 0.8, delay, ease: smoothEase }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
