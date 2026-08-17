"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, MapPin, Mail, Phone, ArrowUpRight, ShieldCheck } from "lucide-react";
import { smoothEase, StaggerContainer, StaggerItem } from "../components/AnimatedSection";

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

  const contactItems = [
    { icon: MapPin, label: "Location", value: "Mumbai, India" },
    { icon: Mail, label: "Email", value: "abhaypandey6903@gmail.com", href: "mailto:abhaypandey6903@gmail.com" },
    { icon: Phone, label: "Phone", value: "+91 84510 74518" },
  ];

  return (
    <section id="contact" className="relative min-h-screen py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('/images/hero-portrait.jpg')` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-deep-space via-deep-space/95 to-deep-space" />
        <div className="absolute inset-0 bg-gradient-to-r from-deep-space/90 via-deep-space/80 to-deep-space/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,138,77,0.08),_transparent_70%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header - CURTAIN REVEAL */}
        <div className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="flex items-center gap-6 mb-4 max-w-2xl mx-auto"
          >
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent origin-center" />
            <span className="text-warm-accent text-xs tracking-[0.3em] uppercase font-medium shrink-0"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>04</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent origin-center" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: false }}
            transition={{ duration: 1, delay: 0.2, ease: smoothEase }}
            className="text-5xl md:text-6xl lg:text-7xl font-light text-white/[0.08] select-none mb-8"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Contact
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Info - CURTAIN FROM LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -60, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: false, margin: "-80px" }}
            transition={{ duration: 1, ease: smoothEase }}
          >
            <div className="space-y-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.8, delay: 0.2, ease: smoothEase }}
              >
                <h3 className="text-3xl md:text-4xl text-white italic leading-tight mb-4"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Let&apos;s Build Something{" "}
                  <span className="text-warm-accent not-italic">Intelligent</span>
                </h3>
                <p className="text-white/40 leading-relaxed max-w-md">
                  Whether you have a project in mind, want to collaborate on AI research,
                  or just want to say hello — I&apos;d love to hear from you.
                </p>
              </motion.div>

              <StaggerContainer className="space-y-6" fast>
                {contactItems.map((item) => (
                  <StaggerItem key={item.label}>
                    <motion.div
                      whileHover={{ x: 8, scale: 1.02 }}
                      transition={{ duration: 0.3, ease: smoothEase }}
                      className="flex items-center gap-4 group cursor-default"
                    >
                      <motion.div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-warm-accent/10 transition-colors"
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.5 }}>
                        <item.icon className="w-5 h-5 text-white/40 group-hover:text-warm-accent transition-colors" />
                      </motion.div>
                      <div>
                        <p className="text-sm text-white/30 uppercase tracking-wider">{item.label}</p>
                        {item.href ? (
                          <a href={item.href} className="text-white/70 hover:text-warm-accent transition-colors">
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-white/70">{item.value}</p>
                        )}
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: 0.4, ease: smoothEase }}
                className="flex gap-4"
              >
                {[
                  { label: "LinkedIn", href: "https://www.linkedin.com/in/abhaypandey06" },
                  { label: "GitHub", href: "https://github.com/abhay6903" },
                ].map((platform) => (
                  <motion.a key={platform.label} href={platform.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-sm text-white/50 hover:text-warm-accent hover:border-warm-accent/30 transition-all"
                    whileHover={{ scale: 1.1, y: -4 }}
                    whileTap={{ scale: 0.95 }}>
                    {platform.label}
                    <ArrowUpRight className="w-3 h-3" />
                  </motion.a>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Right: Form - CURTAIN FROM RIGHT */}
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: false, margin: "-80px" }}
            transition={{ duration: 1, ease: smoothEase }}
          >
            <motion.form
              onSubmit={handleSubmit}
              className="glass-card p-8 md:p-10 space-y-6"
              whileHover={{ 
                y: -6,
                boxShadow: "0 30px 60px -15px rgba(0,0,0,0.9), 0 0 80px -20px rgba(255,138,77,0.1)",
                transition: { duration: 0.4, ease: smoothEase }
              }}
            >
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: smoothEase }}
                  className="text-center py-12"
                >
                  <motion.div className="w-16 h-16 rounded-full bg-warm-accent/20 flex items-center justify-center mx-auto mb-4"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5 }}>
                    <Send className="w-6 h-6 text-warm-accent" />
                  </motion.div>
                  <h4 className="text-xl font-light text-white mb-2"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}>Message Sent!</h4>
                  <p className="text-white/40 text-sm">I&apos;ll get back to you soon.</p>
                </motion.div>
              ) : (
                <>
                  {/* Honeypot - invisible to humans, catches bots */}
                  <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
                    <label htmlFor="website_url">Website</label>
                    <input
                      type="text"
                      id="website_url"
                      name="website_url"
                      tabIndex={-1}
                      autoComplete="off"
                      onChange={(e) => { honeypotRef.current = e.target.value; }}
                    />
                  </div>

                  {securityError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      {securityError}
                    </motion.div>
                  )}

                  {[
                    { label: "Name", type: "text", placeholder: "Your name", key: "name" },
                    { label: "Email", type: "email", placeholder: "your@email.com", key: "email" },
                  ].map((field, i) => (
                    <motion.div key={field.key}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false }}
                      transition={{ delay: 0.1 + i * 0.1, ease: smoothEase }}>
                      <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">{field.label}</label>
                      <input
                        type={field.type}
                        required
                        maxLength={field.key === "email" ? 254 : 100}
                        autoComplete={field.key === "email" ? "email" : "name"}
                        value={formState[field.key as keyof typeof formState]}
                        onChange={(e) => setFormState({ ...formState, [field.key]: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-warm-accent/50 focus:bg-white/[0.07] transition-all duration-300"
                        placeholder={field.placeholder}
                      />
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: 0.3, ease: smoothEase }}>
                    <label className="block text-xs text-white/30 uppercase tracking-wider mb-2">Message</label>
                    <textarea
                      required rows={5}
                      maxLength={1000}
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-warm-accent/50 focus:bg-white/[0.07] transition-all duration-300 resize-none"
                      placeholder="Tell me about your project..."
                    />
                  </motion.div>

                  <motion.button
                    type="submit" disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-warm-accent text-deep-space font-semibold text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div className="w-4 h-4 border-2 border-deep-space/30 border-t-deep-space rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                        Sending...
                      </>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Message</>
                    )}
                  </motion.button>
                </>
              )}
            </motion.form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
