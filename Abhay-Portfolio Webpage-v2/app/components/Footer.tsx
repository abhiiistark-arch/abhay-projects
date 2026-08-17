"use client";

import { motion } from "framer-motion";
import { Github, Linkedin, Mail, ArrowUpRight, Download } from "lucide-react";
import { smoothEase, StaggerContainer, StaggerItem } from "../components/AnimatedSection";

const socialLinks = [
  { icon: Linkedin, href: "https://www.linkedin.com/in/abhaypandey06", label: "LinkedIn" },
  { icon: Github, href: "https://github.com/abhay6903", label: "GitHub" },
  { icon: Mail, href: "mailto:abhaypandey6903@gmail.com", label: "Email" },
];

const quickNav = [
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export function Footer() {
  return (
    <footer className="relative bg-deep-space border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Brand */}
          <StaggerItem>
            <motion.h3 className="text-lg tracking-[0.15em] uppercase text-white mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              whileHover={{ scale: 1.02 }}>
              Abhay Pandey
            </motion.h3>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              AI Engineer — forever learning, exploring, and building what&apos;s next.
            </p>
          </StaggerItem>

          {/* Quick Nav */}
          <StaggerItem>
            <h4 className="text-xs tracking-[0.2em] uppercase text-white/30 mb-6">Navigation</h4>
            <ul className="space-y-3">
              {quickNav.map((item) => (
                <motion.li key={item.href} whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                  <a href={item.href}
                    className="text-sm text-white/50 hover:text-warm-accent transition-colors inline-flex items-center gap-1 group">
                    {item.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </motion.li>
              ))}
            </ul>
          </StaggerItem>

          {/* Social */}
          <StaggerItem>
            <h4 className="text-xs tracking-[0.2em] uppercase text-white/30 mb-6">Connect</h4>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-warm-accent hover:border-warm-accent/30 transition-all"
                  aria-label={social.label}
                  whileHover={{ scale: 1.2, rotate: 360 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.4 }}>
                  <social.icon className="w-4 h-4" />
                </motion.a>
              ))}
              <motion.a
                href="/AbhayPandey_resume.pdf"
                download
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-warm-accent hover:border-warm-accent/30 transition-all"
                aria-label="Resume"
                whileHover={{ scale: 1.2, rotate: 360 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.4 }}
              >
                <Download className="w-4 h-4" />
              </motion.a>
            </div>
          </StaggerItem>
        </StaggerContainer>

        <motion.div
          className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} Abhay Pandey. All rights reserved.</p>
          <p className="text-xs text-white/20">Crafted with Learning and Passion</p>
        </motion.div>
      </div>
    </footer>
  );
}
