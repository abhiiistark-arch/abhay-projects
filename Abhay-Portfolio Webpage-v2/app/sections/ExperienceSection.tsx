"use client";

import { motion } from "framer-motion";
import { smoothEase } from "../components/AnimatedSection";

const experiences = [
  {
    year: "2025 - PRES",
    title: "AI Engineer",
    organization: "Jio Financial Services",
    type: "Payroll: Rbhu ETG",
    desc: "Architecting Agentic systems and RAG pipelines using LangChain, Microsoft Foundry, and AWS Bedrock.",
  },
  {
    year: "2025 - 2025",
    title: "Data Scientist Intern",
    organization: "PassionBytes Pvt Ltd",
    type: "Remote / Data Quality",
    desc: "Implemented large-scale entity resolution and record linkage using Splink and unsupervised learning.",
  },
  {
    year: "2025 - 2025",
    title: "Machine Learning Intern",
    organization: "RDC Concrete Pvt. Ltd.",
    type: "On-site / Vision",
    desc: "Developed end-to-end computer vision pipelines for real-time industrial quality detection systems.",
  },
];

const education = [
  {
    year: "2021 - 2025",
    degree: "B.E. Information Technology",
    school: "University of Mumbai",
    score: "CGPA 8.28",
  }
];

export function ExperienceSection() {
  return (
    <section id="experience" className="relative py-48 px-6 md:px-12 lg:px-24 bg-[#0A0A0A] overflow-hidden">
      {/* Decorative ambient background noise */}
      <div className="noise-overlay opacity-[0.03] z-0" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-48">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 0.3, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="font-mono-meta tracking-[0.5em] mb-12 text-[10px] uppercase font-bold"
          >
            Professional Logbook
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: smoothEase }}
            className="font-serif text-8xl sm:text-9xl lg:text-[10rem] italic tracking-tighter mix-blend-difference"
          >
            The Tenure.
          </motion.h2>
        </div>

        {/* Experience Ledger - Geometric Noir Implementation */}
        <div className="border-t border-white/10 mb-40">
          {experiences.map((exp, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, delay: index * 0.12, ease: smoothEase }}
              className="ledger-row py-14 px-4 sm:px-12 flex flex-wrap lg:flex-nowrap gap-12 items-center group cursor-default relative overflow-hidden"
            >
              {/* Vertical line indicator on hover */}
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-warm-accent scale-y-0 group-hover:scale-y-100 transition-transform duration-700 origin-top" />
              
              <div className="w-full lg:w-44 shrink-0 font-mono-meta text-white/10 group-hover:text-warm-accent transition-all duration-500 tracking-[0.4em] text-[9px] font-bold">
                {exp.year}
              </div>
              
              <div className="flex-1 min-w-[280px]">
                <h3 className="font-serif text-5xl sm:text-6xl text-white/70 group-hover:text-gradient-warm transition-all duration-1000 tracking-tighter leading-none mb-6">
                  {exp.title}
                </h3>
                <div className="flex flex-wrap items-center gap-5">
                  <p className="font-serif text-xl sm:text-2xl tracking-tight text-gradient-warm group-hover:drop-shadow-[0_0_20px_rgba(255,138,77,0.35)] transition-all duration-700">
                    {exp.organization}
                  </p>
                  <div className="w-1.5 h-1.5 rounded-full bg-warm-accent/30 group-hover:bg-warm-accent/60 transition-colors" />
                  <p className="font-mono-meta text-white/20 text-[9px] tracking-[0.3em] uppercase">{exp.type}</p>
                </div>
              </div>

              {/* Desc revealed with lateral slide */}
              <div className="lg:max-w-[320px] text-white/30 text-xs font-sans font-light leading-relaxed opacity-0 group-hover:opacity-100 translate-x-12 group-hover:translate-x-0 transition-all duration-1000 delay-100 hidden xl:block">
                {exp.desc}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Academic Record - Minimalist Ledger */}
        <div className="pt-32 border-t border-white/5 relative">
          {/* Subtle glowing accent */}
          <div className="absolute top-0 left-1/4 w-[400px] h-px bg-gradient-to-r from-transparent via-electric-cyan/20 to-transparent" />
          
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.2 }}
            className="font-mono-meta tracking-[0.5em] mb-20 text-white/40 text-[9px] uppercase font-bold"
          >
            Academic Record
          </motion.div>

          {education.map((edu, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: smoothEase }}
              className="ledger-row py-12 px-4 sm:px-12 flex flex-wrap lg:flex-nowrap gap-12 items-center group cursor-default"
            >
              <div className="w-full lg:w-44 shrink-0 font-mono-meta text-white/10 group-hover:text-electric-cyan transition-all duration-500 tracking-[0.4em] text-[9px] font-bold">
                {edu.year}
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-4xl sm:text-5xl text-white/50 group-hover:text-white transition-all duration-700 tracking-tighter leading-none mb-4">
                  {edu.degree}
                </h3>
                <p className="font-serif text-xl sm:text-2xl tracking-tight text-gradient-warm group-hover:drop-shadow-[0_0_20px_rgba(255,138,77,0.35)] transition-all duration-700">
                  {edu.school}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <div className="font-serif italic text-3xl text-warm-accent/30 group-hover:text-warm-accent transition-all duration-700">
                  {edu.score}
                </div>
                <div className="font-mono-meta text-[8px] text-white/10 tracking-widest mt-2 uppercase">Verified</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Decorative Gradient Shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-deep-space to-transparent z-20 pointer-events-none" />
    </section>
  );
}
