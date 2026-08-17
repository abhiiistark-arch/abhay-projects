"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from "framer-motion";
import Image from "next/image";
import { smoothEase } from "../components/AnimatedSection";
import { HeroParticleField } from "../components/HeroParticleField";

// Preloader - Refined for Noir aesthetic
function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const interval = 16;
    const steps = duration / interval;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const eased = 1 - Math.pow(1 - current / steps, 4); // Smoother easing
      setProgress(Math.min(eased * 100, 100));
      if (current >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 500);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col items-center justify-center overflow-hidden"
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: smoothEase }}
    >
      {/* Background noise for preloader */}
      <div className="absolute inset-0 noise-overlay opacity-[0.03]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10"
      >
        <p className="text-[10px] tracking-[0.5em] uppercase text-white/30 mb-10 font-medium"
           style={{ fontFamily: "var(--font-inter)" }}>
          Initializing System
        </p>
        <div className="w-64 h-px bg-white/5 relative overflow-hidden">
          <motion.div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-warm-accent to-electric-cyan" 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <div className="flex justify-end mt-4">
          <p className="text-xl font-light text-white/20 italic font-serif">
            {Math.round(progress)}%
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const artifactY = useTransform(smoothProgress, [0, 1], [0, 120]);
  const opacity = useTransform(smoothProgress, [0, 0.6], [1, 0]);
  const textScale = useTransform(smoothProgress, [0, 1], [1, 0.95]);

  return (
    <>
      <AnimatePresence mode="wait">
        {!loaded && <Preloader key="preloader" onComplete={() => setLoaded(true)} />}
      </AnimatePresence>

      <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-deep-space pt-20">
        <HeroParticleField active={loaded} containerRef={containerRef} />

        <div className="absolute inset-0 z-[2] pointer-events-none">
          <div className="noise-overlay opacity-[0.025]" />
        </div>

        {/* Large background watermark */}
        <motion.div
          className="absolute inset-0 z-[5] pointer-events-none flex items-end justify-center overflow-hidden pb-8 md:pb-16"
          initial={{ opacity: 0 }}
          animate={loaded ? { opacity: 1 } : {}}
          transition={{ duration: 2, delay: 0.8 }}
        >
          <p className="font-serif text-[clamp(4rem,18vw,16rem)] leading-[0.85] tracking-tighter text-white/[0.06] select-none whitespace-nowrap">
            Abhay Pandey
          </p>
        </motion.div>

        {/* Quadrant Name Labels - Geometric Noir Style */}
        <div className="absolute inset-0 z-10 pointer-events-none p-8 md:p-16 flex flex-col justify-start">
          <div className="flex justify-between items-start">
            <motion.div 
              initial={{ opacity: 0, y: -40, filter: "blur(10px)" }}
              animate={loaded ? { opacity: 0.28, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 1.5, delay: 0.2, ease: smoothEase }}
              className="font-serif text-[clamp(2.5rem,10vw,12rem)] leading-[0.8] tracking-tighter select-none text-white/25"
            >
              ABHAY
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: -40, filter: "blur(10px)" }}
              animate={loaded ? { opacity: 0.28, y: 0, filter: "blur(0px)" } : {}}
              transition={{ duration: 1.5, delay: 0.4, ease: smoothEase }}
              className="font-serif text-[clamp(2.5rem,10vw,12rem)] leading-[0.8] tracking-tighter select-none text-right text-white/25"
            >
              PANDEY
            </motion.div>
          </div>
        </div>

        {/* Hero Content Grid */}
        <div className="relative z-20 w-full max-w-7xl mx-auto px-8 md:px-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center pointer-events-none">
          {/* Prominent Name Block */}
          <motion.div
            className="order-2 lg:order-1 text-center lg:text-left pointer-events-auto"
            initial={{ opacity: 0, x: -40 }}
            animate={loaded ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1.4, delay: 0.6, ease: smoothEase }}
          >
            <p className="font-mono-meta text-[10px] tracking-[0.5em] uppercase text-warm-accent mb-6">
              AI Engineer
            </p>
            <h1 className="font-serif text-[clamp(3.5rem,8vw,7rem)] leading-[0.9] tracking-tighter text-white mb-8">
              Abhay
              <br />
              Pandey
            </h1>
            <p className="font-serif italic text-xl sm:text-2xl lg:text-3xl text-white/60 max-w-md mx-auto lg:mx-0 leading-snug">
              &ldquo;I build intelligent systems that turn ideas into reality.&rdquo;
            </p>
          </motion.div>

          {/* Central Artifact - The Portrait Shield */}
          <motion.div 
            className="order-1 lg:order-2 relative group perspective-[1000px] flex justify-center lg:justify-end pointer-events-auto"
            style={{ y: artifactY, opacity, scale: textScale }}
            initial={{ opacity: 0, scale: 0.9, rotateX: 15 }}
            animate={loaded ? { opacity: 1, scale: 1, rotateX: 0 } : {}}
            transition={{ duration: 1.8, ease: smoothEase }}
          >
            {/* Subtle Glow behind portrait */}
            <div className="absolute inset-0 bg-gradient-to-tr from-warm-accent/10 to-electric-cyan/10 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
            
            <div className="glass-card w-[290px] h-[400px] sm:w-[360px] sm:h-[500px] lg:w-[420px] lg:h-[580px] p-2.5 rotate-[-1.5deg] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-0 group-hover:scale-[1.02] relative overflow-hidden">
              <div className="w-full h-full overflow-hidden grayscale contrast-125 transition-all duration-1000 group-hover:grayscale-0 group-hover:contrast-100 relative">
                <Image 
                  src="/images/hero-portrait.jpg" 
                  alt="Abhay Pandey" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                  priority 
                  quality={95} 
                  sizes="(max-width: 768px) 300px, 450px" 
                />
                {/* Glass shine overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-700" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ambient Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,10,10,0.4)_100%)] pointer-events-none z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-deep-space via-deep-space/60 to-transparent z-20 pointer-events-none" />
      </section>
    </>
  );
}
