"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const directionOffset = {
  up: { y: 36 },
  down: { y: -36 },
  left: { x: 40 },
  right: { x: -40 },
  none: {},
} as const;

export type ScrollFadeDirection = keyof typeof directionOffset;

type ScrollFadeInProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
  delay?: number;
  direction?: ScrollFadeDirection;
  duration?: number;
  once?: boolean;
  amount?: number;
};

/** Fade content in on first paint (for above-the-fold hero content). */
export function EntranceFade({
  children,
  className,
  delay = 0,
  duration = 0.85,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function ScrollFadeIn({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 0.7,
  once = true,
  amount = 0.2,
  ...props
}: ScrollFadeInProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <motion.div className={className} {...props}>
        {children}
      </motion.div>
    );
  }

  const offset = directionOffset[direction];

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration, delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type ScrollFadeStaggerProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
  stagger?: number;
  delayChildren?: number;
  once?: boolean;
  amount?: number;
};

/** Parent container that staggers scroll fade-in for each direct child item. */
export function ScrollFadeStagger({
  children,
  className,
  stagger = 0.1,
  delayChildren = 0.05,
  once = true,
  amount = 0.15,
  ...props
}: ScrollFadeStaggerProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <motion.div className={className} {...props}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type ScrollFadeItemProps = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
  direction?: ScrollFadeDirection;
};

/** Child item used inside ScrollFadeStagger. */
export function ScrollFadeItem({
  children,
  className,
  direction = "up",
  ...props
}: ScrollFadeItemProps) {
  const reduceMotion = useReducedMotion();
  const offset = directionOffset[direction];

  if (reduceMotion) {
    return (
      <motion.div className={className} {...props}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, ...offset },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: 0.65, ease: EASE },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
