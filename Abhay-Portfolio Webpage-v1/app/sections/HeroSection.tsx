"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from "framer-motion";
import Image from "next/image";
import { smoothEase } from "../components/AnimatedSection";

// Preloader
function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useState(() => {
    const duration = 1800;
    const interval = 16;
    const steps = duration / interval;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const eased = 1 - Math.pow(1 - current / steps, 3);
      setProgress(Math.min(eased * 100, 100));
      if (current >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 300);
      }
    }, interval);

    return () => clearInterval(timer);
  });

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-deep-space flex flex-col items-center justify-center"
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: smoothEase }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: smoothEase }}
        className="text-center"
      >
        <p className="text-xs tracking-[0.5em] uppercase text-white/20 mb-8"
           style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Loading Experience
        </p>
        <div className="w-48 h-px bg-white/10 relative overflow-hidden">
          <motion.div className="absolute inset-y-0 left-0 bg-warm-accent" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-2xl font-light text-white/10 mt-6"
           style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          {Math.round(progress)}%
        </p>
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
  const bgY = useTransform(smoothProgress, [0, 1], ["0%", "20%"]);
  const textY = useTransform(smoothProgress, [0, 1], ["0%", "35%"]);
  const opacity = useTransform(smoothProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [1, 1.05]);
  const portraitY = useTransform(smoothProgress, [0, 1], ["0%", "15%"]);

  return (
    <>
      <AnimatePresence>
        {!loaded && <Preloader onComplete={() => setLoaded(true)} />}
      </AnimatePresence>

      <section ref={containerRef} className="relative min-h-[100svh] lg:min-h-[120vh] w-full overflow-hidden bg-deep-space">
        {/* Background */}
        <motion.div className="absolute inset-0 z-0" style={{ y: bgY, scale }}>
          <div className="absolute inset-0 bg-gradient-to-b from-deep-space via-transparent to-deep-space z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-deep-space/80 via-transparent to-deep-space/60 z-10" />
          <div className="absolute inset-0">
            <Image src="/images/hero-portrait.jpg" alt="" fill className="object-cover object-center" priority quality={90} sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#1a0a2e]/60 to-[#0d1b2a]/40" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,138,77,0.08),_transparent_70%)]" />
          </div>
        </motion.div>

        {/* Watermark */}
        <motion.div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none pt-60" style={{ y: textY, opacity }}>
          <motion.h1 
            className="text-[14vw] md:text-[11vw] font-light tracking-tight text-white/[0.05] select-none whitespace-nowrap"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            initial={{ opacity: 0, y: 40 }}
            animate={loaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.4, delay: 0.3, ease: smoothEase }}
          >
            Abhay Pandey
          </motion.h1>
        </motion.div>

        {/* Content */}
        <motion.div className="relative z-20 min-h-[100svh] flex flex-col justify-center px-5 sm:px-6 lg:px-12 max-w-[1400px] mx-auto py-20 sm:py-24 lg:py-0" style={{ opacity }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center pt-20 sm:pt-24 lg:pt-28">

            {/* Left Text */}
            <div className="order-1 lg:order-1 lg:col-span-7 min-w-0 w-full">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={loaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: 0.5, ease: smoothEase }}
                className="text-warm-accent text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-3 sm:mb-6 font-medium"
              >
                AI Engineer
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={loaded ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ duration: 1.2, delay: 0.7, ease: smoothEase }}
                className="mb-5 sm:mb-8"
              >
                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-light tracking-tight leading-[0.95]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  <motion.span className="block text-white"
                    initial={{ opacity: 0, y: 16 }}
                    animate={loaded ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1, delay: 0.9, ease: smoothEase }}>
                    Abhay
                  </motion.span>
                  <motion.span className="block pb-1 sm:pb-2 text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60"
                    initial={{ opacity: 0, y: 16 }}
                    animate={loaded ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1.2, delay: 1.1, ease: smoothEase }}
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Pandey
                  </motion.span>
                </h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={loaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.9, delay: 1.3, ease: smoothEase }}
              >
                <p className="text-lg sm:text-xl md:text-2xl text-white/80 italic leading-relaxed mb-1.5 sm:mb-2 max-w-lg"
                   style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  &ldquo;I build intelligent systems that turn ideas into reality.&rdquo;
                </p>
                <p className="text-xs sm:text-sm md:text-base text-white/40 tracking-wide leading-relaxed whitespace-nowrap overflow-x-auto scrollbar-hide">
                  AI Engineer | Generative AI | AI System Architecture | Hybrid Agents | Voice Agents
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={loaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 1.6, ease: smoothEase }}
                className="mt-6 sm:mt-8 lg:mt-10 flex flex-wrap gap-3 sm:gap-4"
              >
                <motion.a href="#projects"
                  className="inline-flex items-center px-8 py-3.5 rounded-full bg-warm-accent text-deep-space font-semibold text-sm"
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.97 }}>
                  View My Work
                </motion.a>
                <motion.a href="#contact"
                  className="inline-flex items-center px-8 py-3.5 rounded-full border border-white/20 text-white text-sm hover:bg-white/5 hover:border-warm-accent/40 transition-all"
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.97 }}>
                  Get in Touch
                </motion.a>
              </motion.div>
            </div>

            {/* Right Portrait - desktop only; mobile uses background image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, x: 80 }}
              animate={loaded ? { opacity: 1, scale: 1, x: 0 } : {}}
              transition={{ duration: 1.3, delay: 0.6, ease: smoothEase }}
              className="hidden lg:block lg:order-2 lg:col-span-5 relative"
              style={{ y: portraitY }}
            >
              <div className="relative aspect-[3/4] max-w-md mx-auto lg:max-w-none lg:ml-auto">
                <motion.div 
                  className="absolute -inset-4 bg-gradient-to-tr from-warm-accent/20 via-transparent to-electric-cyan/10 rounded-3xl blur-2xl"
                  animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.02, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative rounded-3xl overflow-hidden cinematic-shadow">
                  <Image src="/images/hero-portrait.jpg" alt="Abhay Pandey" fill className="object-cover object-top" priority quality={95} sizes="50vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-deep-space/60 via-transparent to-deep-space/30" />
                </div>
              </div>
            </motion.div>
          </div>

        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-deep-space to-transparent z-30" />
      </section>
    </>
  );
}
