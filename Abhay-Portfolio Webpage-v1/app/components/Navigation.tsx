"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "About", href: "#about" },
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
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-deep-space/80 backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            <motion.a
              href="#"
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="group min-w-0 flex-1 pr-2"
              data-cursor="pointer"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <span
                className="block text-xs sm:text-sm md:text-base tracking-[0.12em] sm:tracking-[0.18em] md:tracking-[0.25em] uppercase text-white/90 hover:text-warm-accent transition-colors duration-300 whitespace-nowrap leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Abhay Pandey
              </span>
            </motion.a>

            <div className="hidden md:flex items-center gap-10">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.5 }}
                  className="relative text-base tracking-wide text-white/60 hover:text-white transition-colors duration-300 group outline-none focus:outline-none focus-visible:outline-none"
                  data-cursor="pointer"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-warm-accent group-hover:w-full transition-all duration-300" />
                </motion.a>
              ))}
            </div>

            <motion.div
              className="hidden md:flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <a
                href="#projects"
                className="inline-flex items-center px-6 py-2.5 rounded-full text-base text-warm-accent hover:text-white active:text-white transition-all duration-300 hover:scale-105"
                data-cursor="pointer"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                View Work
              </a>
              <a
                href="#contact"
                className="inline-flex items-center px-6 py-2.5 rounded-full text-base text-warm-accent hover:text-white active:text-white transition-all duration-300 hover:scale-105"
                data-cursor="pointer"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Get in Touch
              </a>
            </motion.div>

            <button
              className="md:hidden p-2 text-white/80 shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              data-cursor="pointer"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-deep-space/95 backdrop-blur-xl pt-24 px-6 pb-8 overflow-y-auto"
          >
            <div className="flex flex-col gap-6">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-3xl text-white/80 hover:text-warm-accent transition-colors"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {link.label}
                </motion.a>
              ))}
              <div className="mt-4 flex flex-col gap-3">
                <motion.a
                  href="#projects"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full text-base text-warm-accent hover:text-white active:text-white transition-colors"
                >
                  View Work
                </motion.a>
                <motion.a
                  href="#contact"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center px-8 py-3 rounded-full text-base text-warm-accent hover:text-white active:text-white transition-colors"
                >
                  Get in Touch
                </motion.a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
