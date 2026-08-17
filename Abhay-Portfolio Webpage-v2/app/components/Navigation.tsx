"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 w-full z-[100] px-8 md:px-16 py-8 flex justify-between items-end pointer-events-none transition-all duration-700 ${
          isScrolled ? 'bg-[#0A0A0A]/40 backdrop-blur-xl py-6' : 'bg-transparent py-10'
        }`}
      >
        {/* Brand Identity */}
        <div 
          className="pointer-events-auto group cursor-pointer" 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-serif text-2xl md:text-3xl tracking-tighter text-white mix-blend-difference leading-none group-hover:text-warm-accent transition-colors duration-500"
          >
            Abhay Pandey
          </motion.div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-14 pointer-events-auto mix-blend-difference items-center">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.href}
              href={link.href}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono-meta text-[10px] tracking-[0.3em] uppercase text-white/50 hover:text-white transition-all duration-500 relative group"
            >
              <span className="text-warm-accent/40 mr-2 group-hover:text-warm-accent">/</span>
              {link.label}
              <span className="absolute -bottom-2 left-0 w-0 h-px bg-warm-accent group-hover:w-full transition-all duration-700" />
            </motion.a>
          ))}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden pointer-events-auto p-3 text-white/60 hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ type: "spring", damping: 35, stiffness: 200 }}
            className="fixed inset-0 z-[150] bg-[#0A0A0A] flex flex-col items-center justify-center gap-10 overflow-hidden"
          >
            {/* Background noise and geometric hint */}
            <div className="absolute inset-0 noise-overlay opacity-[0.05]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full aspect-square border border-white/[0.03] rotate-45 pointer-events-none" />
            
            <button 
              className="absolute top-12 right-8 text-white/30 hover:text-white transition-colors" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={40} strokeWidth={1} />
            </button>
            
            <div className="flex flex-col items-center gap-8 relative z-10">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="font-serif text-6xl italic text-white/70 hover:text-warm-accent transition-all duration-500 tracking-tighter"
                >
                  {link.label}
                </motion.a>
              ))}
            </div>

            <div className="mt-20 font-mono-meta text-[9px] tracking-[0.5em] text-white/10 uppercase">
              System v3.0.12
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
