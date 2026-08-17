"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, ShieldCheck } from "lucide-react";
import { smoothEase } from "../components/AnimatedSection";

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;
const MIN_FILL_TIME_MS = 2_000;

function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
    .slice(0, 1000);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function ContactSection() {
  const [formState, setFormState] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [securityError, setSecurityError] = useState("");

  const honeypotRef = useRef("");
  const formLoadTime = useRef(Date.now());
  const submissionTimestamps = useRef<number[]>([]);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    submissionTimestamps.current = submissionTimestamps.current.filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS
    );
    if (submissionTimestamps.current.length >= MAX_SUBMISSIONS_PER_WINDOW) {
      return false;
    }
    submissionTimestamps.current.push(now);
    return true;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError("");

    if (honeypotRef.current) {
      setIsSubmitting(true);
      await new Promise((r) => setTimeout(r, 1500));
      setIsSubmitting(false);
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);
      return;
    }

    if (Date.now() - formLoadTime.current < MIN_FILL_TIME_MS) {
      setSecurityError("Please take your time filling out the form.");
      return;
    }

    if (!checkRateLimit()) {
      setSecurityError("Too many submissions. Please wait a minute before trying again.");
      return;
    }

    const cleanName = sanitizeInput(formState.name);
    const cleanEmail = sanitizeInput(formState.email);
    const cleanMessage = sanitizeInput(formState.message);

    if (!cleanName || cleanName.length < 2) {
      setSecurityError("Please enter a valid name.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setSecurityError("Please enter a valid email address.");
      return;
    }

    if (!cleanMessage || cleanMessage.length < 10) {
      setSecurityError("Please enter a message (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setFormState({ name: "", email: "", message: "" });
    formLoadTime.current = Date.now();
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  return (
    <section id="contact" className="relative min-h-screen flex items-center justify-center py-24 md:py-28 bg-[#0A0A0A] overflow-hidden">
      {/* Background video layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video 
          src="/videos/Contact_bg.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-[0.55] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-[#0A0A0A]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(10,10,10,0.65)_100%)]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-6 md:px-8 flex flex-col md:flex-row gap-12 lg:gap-24 items-start md:items-center">
        
        {/* Left Side: Transmission Info */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: smoothEase }}
          >
            <div className="mb-8">
              <div className="font-serif text-xl tracking-tighter text-white/90">Abhay Pandey</div>
            </div>

            <div className="font-mono-meta text-[10px] tracking-[0.5em] text-warm-accent mb-4 uppercase">Transmission</div>
            <h2 className="font-serif text-5xl sm:text-6xl md:text-7xl mb-10 md:mb-12 italic leading-none tracking-tighter mix-blend-difference">
              Initiate <br /> Contact.
            </h2>
            
            <div className="space-y-8">
              <a href="mailto:abhaypandey6903@gmail.com" className="block font-serif text-xl sm:text-2xl md:text-3xl text-white/80 hover:text-warm-accent transition-all duration-500 underline underline-offset-8 decoration-white/10 hover:decoration-warm-accent/40">
                abhaypandey6903@gmail.com
              </a>
              
              <div className="flex gap-10 font-mono-meta text-[10px] tracking-[0.3em] text-white/20">
                <a href="https://www.linkedin.com/in/abhaypandey06" target="_blank" className="hover:text-white transition-colors">LINKEDIN</a>
                <a href="https://github.com/abhay6903" target="_blank" className="hover:text-white transition-colors">GITHUB</a>
                <a href="#" className="hover:text-white transition-colors">TWITTER / X</a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Editorial Form */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, x: 40 }}
          whileInView={{ opacity: 1, scale: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: smoothEase }}
          className="w-full md:w-[380px] lg:w-[420px] glass-card p-8 lg:p-10 bg-white/[0.02] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          {/* Subtle noise and light on the form */}
          <div className="absolute inset-0 noise-overlay opacity-[0.02]" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="font-serif italic text-2xl text-white mb-4 tracking-tight">Transmission Sent.</div>
              <p className="font-mono-meta text-[10px] text-white/30 tracking-[0.3em]">REPLY PENDING</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              {/* Honeypot */}
              <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0 }}>
                <input type="text" onChange={(e) => { honeypotRef.current = e.target.value; }} tabIndex={-1} autoComplete="off" />
              </div>

              {securityError && (
                <div className="text-[10px] font-mono-meta text-red-400 tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" />
                  {securityError.toUpperCase()}
                </div>
              )}

              <div className="space-y-2 group">
                <label className="font-mono-meta text-[9px] tracking-[0.4em] text-white/20 group-focus-within:text-warm-accent transition-colors uppercase">Identity</label>
                <input 
                  type="text" 
                  required
                  placeholder="Your Name" 
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full bg-transparent border-b border-white/5 py-3 font-serif text-lg text-white placeholder:text-white/10 focus:outline-none focus:border-warm-accent transition-all duration-700"
                />
              </div>

              <div className="space-y-2 group">
                <label className="font-mono-meta text-[9px] tracking-[0.4em] text-white/20 group-focus-within:text-warm-accent transition-colors uppercase">Digital Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="email@provider.com" 
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  className="w-full bg-transparent border-b border-white/5 py-3 font-serif text-lg text-white placeholder:text-white/10 focus:outline-none focus:border-warm-accent transition-all duration-700"
                />
              </div>

              <div className="space-y-2 group">
                <label className="font-mono-meta text-[9px] tracking-[0.4em] text-white/20 group-focus-within:text-warm-accent transition-colors uppercase">Confession</label>
                <textarea 
                  required
                  placeholder="Your Message..." 
                  rows={3}
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  className="w-full bg-transparent border-b border-white/5 py-3 font-serif text-lg text-white placeholder:text-white/10 focus:outline-none focus:border-warm-accent transition-all duration-700 resize-none"
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-5 mt-6 border border-white/10 font-serif text-xl italic text-white/90 hover:bg-white hover:text-[#0A0A0A] transition-all duration-1000 flex items-center justify-center gap-4 group"
              >
                {isSubmitting ? "TRANSMITTING..." : (
                  <>
                    Send Transmission
                    <Send className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" strokeWidth={1} />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
