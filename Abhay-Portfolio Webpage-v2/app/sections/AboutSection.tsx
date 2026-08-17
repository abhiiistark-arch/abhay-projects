"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { Cpu, Network, Database, Eye, Cloud, ArrowUpRight, Wrench, Bot, Mic, Brain, Server, Code2 } from "lucide-react";
import { smoothEase } from "../components/AnimatedSection";

const strengths = [
  { icon: Cpu, label: "Generative AI", desc: "LLM orchestration & fine-tuning" },
  { icon: Network, label: "Agentic Systems", desc: "Autonomous AI agents & workflows" },
  { icon: Database, label: "RAG Pipelines", desc: "Vector search & semantic retrieval" },
  { icon: Eye, label: "Computer Vision", desc: "Object detection & classification" },
  { icon: Cloud, label: "Cloud Architecture", desc: "AWS, Azure & scalable infra" },
];

const techStack = [
  {
    label: "AI & Agents",
    icon: Bot,
    accent: "#FF8A4D",
    accentBg: "rgba(255, 138, 77, 0.08)",
    accentBorder: "rgba(255, 138, 77, 0.25)",
    tags: ["LangChain", "LangGraph", "MCP", "CrewAI", "AutoGen", "OpenAI", "Bedrock"],
  },
  {
    label: "Voice & Realtime",
    icon: Mic,
    accent: "#4ADE80",
    accentBg: "rgba(74, 222, 128, 0.08)",
    accentBorder: "rgba(74, 222, 128, 0.25)",
    tags: ["LiveKit", "WebRTC", "Whisper", "ElevenLabs", "Deepgram"],
  },
  {
    label: "ML & Vision",
    icon: Brain,
    accent: "#A78BFA",
    accentBg: "rgba(167, 139, 250, 0.08)",
    accentBorder: "rgba(167, 139, 250, 0.25)",
    tags: ["PyTorch", "TensorFlow", "OpenCV", "Scikit-learn", "YOLO"],
  },
  {
    label: "Data & Vector",
    icon: Server,
    accent: "#2DD4BF",
    accentBg: "rgba(45, 212, 191, 0.08)",
    accentBorder: "rgba(45, 212, 191, 0.25)",
    tags: ["Qdrant", "OpenSearch", "PySpark", "MongoDB", "PostgreSQL"],
  },
  {
    label: "Dev & Deploy",
    icon: Code2,
    accent: "#60A5FA",
    accentBg: "rgba(96, 165, 250, 0.08)",
    accentBorder: "rgba(96, 165, 250, 0.25)",
    tags: ["Python", "FastAPI", "Docker", "AWS", "Node.js", "React"],
  },
];

export function AboutSection() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [40, -140]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section id="about" ref={containerRef} className="relative py-36 md:py-72 px-6 md:px-24 bg-[#0A0A0A] overflow-hidden">
      {/* Smoking Background Effect - Layered Noir */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video 
          src="https://videos.pexels.com/video-files/4320606/4320606-uhd_2560_1440_24fps.mp4" 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="w-full h-full object-cover opacity-25 brightness-[0.2] contrast-150 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#0A0A0A_100%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 lg:gap-36 items-center">
          
          {/* Fractured Glass Visuals - The Noir Composition */}
          <div className="col-span-12 lg:col-span-5 relative h-[500px] sm:h-[700px] flex items-center justify-center">
            {/* Background floating geometric border */}
            <motion.div 
              style={{ y: y2, opacity }}
              className="absolute w-[80%] h-[80%] border border-white/5 z-0 translate-x-12 translate-y-12 rounded-3xl" 
            />
            
            {/* Secondary glass layer for depth */}
            <motion.div 
              style={{ y: y1, opacity }}
              className="absolute w-[60%] h-[60%] glass-card z-10 -translate-x-16 -translate-y-8 opacity-40 blur-[1px]"
            />

            {/* Main Portrait Glass Card */}
            <motion.div 
              style={{ y: y1, opacity }}
              className="relative w-[90%] h-[90%] glass-card z-20 p-2.5 shadow-[0_0_100px_-20px_rgba(255,138,77,0.15)] overflow-hidden group"
            >
              <div className="w-full h-full overflow-hidden rounded-xl relative">
                <Image 
                  src="/images/about-portrait.png" 
                  alt="Abhay Pandey" 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                  quality={100} 
                  sizes="(max-width: 768px) 90vw, 40vw" 
                />
                {/* Noir Vignette on Portrait */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-transparent to-transparent opacity-60" />
                <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
              </div>
            </motion.div>

            {/* Focal Point Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-warm-accent/5 to-transparent blur-[150px] pointer-events-none" />
          </div>

          {/* Content Area - Refined with Resume Data */}
          <div className="col-span-12 lg:col-span-7 pt-4 sm:pt-8 lg:pt-0">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: smoothEase }}
            >
              <div className="font-mono-meta text-warm-accent mb-8 md:mb-10 flex items-center gap-5">
                <span className="tracking-[0.5em]">/ 01 BACKGROUND</span>
                <div className="w-16 h-px bg-warm-accent/20" />
              </div>
              
              <h2 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-10 md:mb-14 leading-[0.9] tracking-tighter mix-blend-difference">
                Beyond the <br />
                <span className="italic text-white/20">Visible Surface.</span>
              </h2>

              <div className="max-w-2xl space-y-10 md:space-y-12 font-serif">
                <p className="text-xl sm:text-2xl md:text-3xl text-white/90 leading-[1.2] tracking-tight">
                  Taking inspiration from the ultimate tinkerer himself, I architect <span className="text-gradient-warm">intelligent systems</span> that solve complex problems.
                </p>
                
                <div className="space-y-6 text-base sm:text-lg md:text-xl font-sans font-light text-white/40 leading-relaxed max-w-xl md:max-w-2xl">
                  <p>
                    I&apos;m <span className="text-white/80 font-medium">Abhay Pandey</span>, an AI Engineer specializing in <span className="text-white/70">Agentic AI</span>, 
                    <span className="text-white/70"> RAG Pipelines</span>, and <span className="text-white/70">Intelligent Automation</span>. 
                    I focus on creating production-ready solutions that are scalable, reliable, and impactful.
                  </p>
                  <p>
                    From designing autonomous AI agents with <span className="text-electric-cyan/80">LangChain</span> and <span className="text-electric-cyan/80">LangGraph</span> to 
                    developing high-accuracy <span className="text-electric-cyan/80">Computer Vision</span> pipelines, I bridge the gap between 
                    innovation and real-world business needs.
                  </p>
                </div>
              </div>

              <div className="mt-16 md:mt-20 pt-12 md:pt-14 border-t border-white/5 relative">
                <div className="absolute top-0 left-0 w-20 h-px bg-gradient-to-r from-warm-accent/40 to-transparent" />
                <div className="font-mono-meta mb-6 text-white/30 tracking-[0.2em]">PHILOSOPHY</div>
                <p className="font-serif italic text-xl md:text-2xl text-white/50 leading-relaxed max-w-xl md:max-w-2xl mb-10">
                  &ldquo;Elegance is not abundance, but the perfect elimination of the unnecessary.&rdquo;
                </p>
                <a href="#experience" className="inline-flex items-center gap-4 font-mono-meta text-[10px] text-warm-accent hover:text-white transition-all duration-500 group tracking-[0.3em]">
                  VIEW PROFESSIONAL LOGBOOK
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Core Competency Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease: smoothEase }}
          className="mt-24 md:mt-32"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {strengths.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: smoothEase }}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 flex flex-col items-center text-center hover:border-warm-accent/20 hover:bg-white/[0.05] transition-all duration-500"
              >
                <div className="w-11 h-11 rounded-xl border border-white/10 flex items-center justify-center mb-5 group-hover:border-warm-accent/30 group-hover:bg-warm-accent/5 transition-all duration-500">
                  <item.icon className="w-5 h-5 text-white/50 group-hover:text-warm-accent transition-colors duration-500" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-lg text-white/90 mb-2 tracking-tight">{item.label}</h3>
                <p className="text-xs font-sans font-light text-white/40 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech Stack Panel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, delay: 0.1, ease: smoothEase }}
          className="mt-6 rounded-3xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent backdrop-blur-md p-8 md:p-10 lg:p-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,138,77,0.06),transparent_50%)] pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="relative z-10 flex items-center gap-3 mb-10 md:mb-12">
            <Wrench className="w-4 h-4 text-warm-accent" strokeWidth={1.5} />
            <h3 className="font-serif text-xl md:text-2xl tracking-[0.15em] uppercase text-white/90">Tech Stack</h3>
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10 xl:gap-6">
            {techStack.map((category, i) => (
              <motion.div
                key={category.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: smoothEase }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <category.icon className="w-4 h-4 shrink-0" style={{ color: category.accent }} strokeWidth={1.5} />
                  <span
                    className="font-mono-meta text-[10px] tracking-[0.25em] uppercase font-semibold"
                    style={{ color: category.accent }}
                  >
                    {category.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full text-[11px] font-sans font-light text-white/70 border transition-all duration-300 hover:scale-[1.03]"
                      style={{
                        backgroundColor: category.accentBg,
                        borderColor: category.accentBorder,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Decorative Noise & Vignette */}
      <div className="noise-overlay opacity-[0.03]" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-deep-space to-transparent z-20 pointer-events-none" />
    </section>
  );
}
