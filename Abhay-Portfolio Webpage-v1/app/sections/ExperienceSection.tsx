"use client";

import { motion } from "framer-motion";
import { Briefcase, GraduationCap, Award, Trophy, FileText } from "lucide-react";
import { smoothEase, StaggerContainer, StaggerItem } from "../components/AnimatedSection";

const experiences = [
  {
    icon: Briefcase,
    title: "AI Forward Deployed Engineer",
    organization: "Jio Financial Services",
    location: "Mumbai, Maharashtra",
    period: "Nov 2024 – Present",
    description: "Building AI Agents and RAG-based chatbots using LangChain with memory. Leveraging Microsoft Foundry, AWS Bedrock, and Google Vertex AI. Developed AI voice bots with inbound/outbound calling, WhatsApp, and email automation. Implemented Fabric Data Agents and Power BI analytics over Data Lake.",
    highlights: ["AI Agents", "RAG Systems", "Voice Bots", "Power BI", "Cloud"],
    current: true,
  },
  {
    icon: Briefcase,
    title: "Data Scientist Intern",
    organization: "PassionBytes Pvt Ltd",
    location: "",
    period: "Aug 2024 – Nov 2024",
    description: "Implemented data deduplication and entity resolution using Splink across large datasets. Utilized Trino for distributed SQL querying and MinIO for scalable data storage, enabling efficient big data analytics.",
    highlights: ["Splink", "Trino", "MinIO", "Data Quality"],
    current: false,
  },
  {
    icon: Briefcase,
    title: "Machine Learning Intern",
    organization: "RDC Concrete",
    location: "",
    period: "April 2024 – July 2024",
    description: "Designed and deployed ML pipeline for detecting construction materials and predicting quality. Integrated with company's Data Management System for real-time inspection and reporting. Led data preprocessing, computer vision modeling, and API development.",
    highlights: ["Computer Vision", "ML Pipeline", "API Development", "Quality Detection"],
    current: false,
  },
];

const education = {
  degree: "Bachelor of Engineering (Information Technology)",
  school: "University of Mumbai",
  period: "June 2021 – May 2025",
  cgpa: "8.28",
  coursework: ["Cloud Computing", "Machine Learning", "Neural Networks", "Data Structures & Algorithms", "Computer Networks", "Databases"],
};

const achievements = [
  { icon: Award, label: "GATE 2024", desc: "Qualified" },
  { icon: Award, label: "GATE 2025", desc: "Qualified" },
  { icon: Trophy, label: "IEEE Poster Competition", desc: "First Prize (Intercollege, 2023)" },
  { icon: FileText, label: "ICTEAH 2025", desc: "Research Paper ID 142" },
];

export function ExperienceSection() {
  return (
    <section id="experience" className="relative bg-deep-space py-36 overflow-hidden">
      <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-electric-cyan/5 rounded-full blur-[200px] -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header - CURTAIN REVEAL */}
        <div className="mb-20">
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="flex items-center gap-6 mb-4"
          >
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent origin-center" />
            <span className="text-warm-accent text-xs tracking-[0.3em] uppercase font-medium shrink-0"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>03</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent origin-center" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: false }}
            transition={{ duration: 1, delay: 0.2, ease: smoothEase }}
            className="text-5xl md:text-7xl lg:text-8xl font-light text-center text-white/[0.08] select-none"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Experience
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left: Timeline - CURTAIN FROM LEFT */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-80px" }}
            transition={{ duration: 0.9, ease: smoothEase }}
          >
            <StaggerContainer className="relative">
              {/* Vertical line */}
              <motion.div 
                className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 1.2, ease: smoothEase }}
                style={{ transformOrigin: "top" }}
              />

              {experiences.map((exp, index) => (
                <StaggerItem key={exp.title}>
                  <motion.div
                    className="relative pl-16 pb-20 last:pb-0 group"
                    whileHover={{ x: 8, scale: 1.01 }}
                    transition={{ duration: 0.3, ease: smoothEase }}
                  >
                    {/* Timeline node */}
                    <div className="absolute left-0 top-0">
                      <motion.div
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                          exp.current ? "border-warm-accent bg-warm-accent/10" : "border-white/10 bg-deep-space group-hover:border-white/30"
                        }`}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.5, delay: 0.2, ease: smoothEase }}
                        whileHover={{ scale: 1.15, rotate: 10 }}
                      >
                        <exp.icon className={`w-5 h-5 ${exp.current ? "text-warm-accent" : "text-white/40"}`} />
                      </motion.div>
                      {index !== experiences.length - 1 && (
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-white/10 to-transparent" />
                      )}
                    </div>

                    {/* Content Card - POP UP */}
                    <motion.div
                      className="glass-card p-6 cursor-default"
                      whileHover={{ 
                        y: -6,
                        boxShadow: "0 30px 60px -15px rgba(0,0,0,0.9), 0 0 80px -20px rgba(255,138,77,0.15)",
                        transition: { duration: 0.4, ease: smoothEase }
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className={`text-xs px-3 py-1 rounded-full ${exp.current ? "bg-warm-accent/20 text-warm-accent" : "bg-white/5 text-white/40"}`}>
                          {exp.period}
                        </span>
                        {exp.current && (
                          <span className="flex items-center gap-1.5 text-xs text-warm-accent">
                            <motion.span className="w-1.5 h-1.5 rounded-full bg-warm-accent"
                              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity }} />
                            Current
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-light text-white mb-1"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {exp.title}
                      </h3>
                      <p className="text-sm text-white/50 mb-1">
                        {exp.organization}{exp.location && ` — ${exp.location}`}
                      </p>
                      <p className="text-sm text-white/40 leading-relaxed mt-3 mb-4">{exp.description}</p>

                      <div className="flex flex-wrap gap-2">
                        {exp.highlights.map((highlight) => (
                          <motion.span key={highlight}
                            className="text-xs px-2 py-1 rounded bg-white/5 text-white/40"
                            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,138,77,0.1)", color: "rgba(255,138,77,0.8)" }}
                            transition={{ duration: 0.2 }}>
                            {highlight}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </motion.div>

          {/* Right: Education & Achievements - CURTAIN FROM RIGHT */}
          <motion.div
            className="lg:col-span-5 space-y-14"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-80px" }}
            transition={{ duration: 0.9, ease: smoothEase }}
          >
            {/* Education Card - POP UP */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8, ease: smoothEase }}
              whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.4, ease: smoothEase } }}
              className="glass-card p-8 cursor-default"
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div className="w-10 h-10 rounded-lg bg-warm-accent/10 flex items-center justify-center"
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.6 }}>
                  <GraduationCap className="w-5 h-5 text-warm-accent" />
                </motion.div>
                <h3 className="text-lg font-light text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Education
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-white/80 font-medium">{education.degree}</h4>
                  <p className="text-sm text-white/40">{education.school}</p>
                  <p className="text-sm text-white/30 mt-1">{education.period}</p>
                </div>

                <div className="flex items-center gap-4 py-4 border-t border-white/5">
                  <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.3 }}>
                    <p className="text-3xl font-light text-warm-accent"
                       style={{ fontFamily: "'Cormorant Garamond', serif" }}>{education.cgpa}</p>
                    <p className="text-xs text-white/30 uppercase tracking-wider">CGPA</p>
                  </motion.div>
                </div>

                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Key Coursework</p>
                  <div className="flex flex-wrap gap-2">
                    {education.coursework.map((course, i) => (
                      <motion.span key={course}
                        className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/40 border border-white/5"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: false }}
                        transition={{ delay: i * 0.05, ease: smoothEase }}
                        whileHover={{ scale: 1.1, borderColor: "rgba(255,138,77,0.3)" }}>
                        {course}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Achievements - STAGGERED POP UP */}
            <div>
              <h3 className="text-lg font-light text-white mb-6 flex items-center gap-3"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                <Award className="w-5 h-5 text-warm-accent" />
                Achievements
              </h3>
              <StaggerContainer className="space-y-5" fast>
                {achievements.map((achievement) => (
                  <StaggerItem key={achievement.label}>
                    <motion.div
                      whileHover={{ 
                        x: 8, 
                        scale: 1.03,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderColor: "rgba(255,138,77,0.3)",
                        transition: { duration: 0.3, ease: smoothEase }
                      }}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 cursor-default"
                    >
                      <motion.div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0"
                        whileHover={{ rotate: 360, scale: 1.2, backgroundColor: "rgba(255,138,77,0.1)" }}
                        transition={{ duration: 0.5 }}>
                        <achievement.icon className="w-4 h-4 text-white/40" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-medium text-white/70">{achievement.label}</p>
                        <p className="text-xs text-white/30 mt-0.5">{achievement.desc}</p>
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
