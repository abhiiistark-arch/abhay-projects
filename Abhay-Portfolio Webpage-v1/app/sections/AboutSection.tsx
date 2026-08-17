"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Cpu, Network, Database, Eye, Cloud, Bot, Mic, Brain, Layers, Wrench } from "lucide-react";
import { smoothEase, StaggerContainer, StaggerItem } from "../components/AnimatedSection";

const strengths = [
  { icon: Cpu, label: "Generative AI", desc: "LLM orchestration & fine-tuning" },
  { icon: Network, label: "Agentic Systems", desc: "Autonomous AI agents & workflows" },
  { icon: Database, label: "RAG Pipelines", desc: "Vector search & semantic retrieval" },
  { icon: Eye, label: "Computer Vision", desc: "Object detection & classification" },
  { icon: Cloud, label: "Cloud Architecture", desc: "AWS, Azure & scalable infra" },
];

const techStack = [
  {
    category: "AI & Agents",
    icon: Bot,
    color: "from-warm-accent/20 to-warm-accent/5",
    borderColor: "border-warm-accent/20",
    textColor: "text-warm-accent",
    skills: ["LangChain", "LangGraph", "MCP", "CrewAI", "AutoGen", "OpenAI", "Bedrock"],
  },
  {
    category: "Voice & Realtime",
    icon: Mic,
    color: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "border-emerald-500/20",
    textColor: "text-emerald-400",
    skills: ["LiveKit", "WebRTC", "Whisper", "ElevenLabs", "Deepgram"],
  },
  {
    category: "ML & Vision",
    icon: Brain,
    color: "from-purple-500/20 to-purple-500/5",
    borderColor: "border-purple-500/20",
    textColor: "text-purple-400",
    skills: ["PyTorch", "TensorFlow", "OpenCV", "Scikit-learn", "YOLO"],
  },
  {
    category: "Data & Vector",
    icon: Layers,
    color: "from-electric-cyan/20 to-electric-cyan/5",
    borderColor: "border-electric-cyan/20",
    textColor: "text-electric-cyan",
    skills: ["Qdrant", "OpenSearch", "PySpark", "MongoDB", "PostgreSQL"],
  },
  {
    category: "Dev & Deploy",
    icon: Wrench,
    color: "from-blue-500/20 to-blue-500/5",
    borderColor: "border-blue-500/20",
    textColor: "text-blue-400",
    skills: ["Python", "FastAPI", "Docker", "AWS", "Node.js", "React"],
  },
];

export function AboutSection() {
  return (
    <section id="about" className="relative bg-deep-space py-14 md:py-20 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-warm-accent/5 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10 md:mb-12">
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="flex items-center gap-6 mb-4"
          >
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent origin-center" />
            <span className="text-warm-accent text-xs tracking-[0.3em] uppercase font-medium shrink-0"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              01
            </span>
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
            About Me
          </motion.h2>
        </div>

        {/* Bold Opening Quote */}
        <motion.blockquote
          initial={{ opacity: 0, y: 40, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: false, margin: "-80px" }}
          transition={{ duration: 1, ease: smoothEase }}
          className="mb-10 md:mb-12 max-w-4xl mx-auto lg:mx-0 text-center lg:text-left"
        >
          <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight"
             style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            &ldquo;Sometimes you gotta run before you can walk.&rdquo;
          </p>
        </motion.blockquote>

        {/* Two-column: Portrait + Intro + Strengths */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-10">
          {/* Portrait */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, x: -40, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: false, margin: "-80px" }}
              transition={{ duration: 1, ease: smoothEase }}
            >
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.92 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.9, delay: 0.2, ease: smoothEase }}
                whileHover={{ scale: 1.02 }}
                className="relative aspect-[3/4] max-w-sm mx-auto lg:max-w-none rounded-2xl overflow-hidden cursor-default"
              >
                <Image src="/images/about-portrait.png" alt="Abhay Pandey" fill
                       className="object-cover transition-transform duration-700 hover:scale-105"
                       quality={90} sizes="33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-space/50 to-transparent" />
                <motion.div className="absolute bottom-4 left-4"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false }}
                  transition={{ delay: 0.6 }}>
                  <p className="text-xs text-white/50 tracking-wider uppercase">Mumbai, India</p>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* Text + Strength Cards */}
          <motion.div
            className="lg:col-span-8 flex flex-col gap-8"
            initial={{ opacity: 0, x: 40, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: false, margin: "-80px" }}
            transition={{ duration: 1, ease: smoothEase }}
          >
            <StaggerContainer className="space-y-5 text-white/60 leading-relaxed" fast>
              <StaggerItem>
                <p className="text-lg md:text-xl text-white/80 leading-relaxed"
                   style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Taking inspiration from the ultimate tinkerer himself, my approach to
                  engineering is simple: find a complex problem, build an elegant solution,
                  and deploy it to production. I don&apos;t just write code; I architect
                  systems that work.
                </p>
              </StaggerItem>

              <StaggerItem>
                <p>
                  Hi! I&apos;m <span className="text-white/80 font-medium">Abhay Pandey</span>, an
                  AI Engineer &amp; Analyst passionate about building intelligent systems that solve
                  real-world business problems. I specialize in{" "}
                  <span className="text-electric-cyan">Agentic AI</span>,{" "}
                  <span className="text-electric-cyan">Retrieval-Augmented Generation (RAG)</span>,{" "}
                  <span className="text-electric-cyan">Conversational AI</span>, and{" "}
                  <span className="text-electric-cyan">Intelligent Automation</span>, creating
                  production-ready solutions that are scalable, reliable, and impactful.
                </p>
              </StaggerItem>

              <StaggerItem>
                <p>
                  My work involves designing AI agents, developing advanced RAG architectures, building
                  real-time voice assistants, integrating enterprise data systems, and deploying
                  end-to-end AI applications using modern cloud and AI technologies. From transforming
                  unstructured data into actionable insights to enabling AI systems capable of reasoning,
                  retrieval, and decision-making, I focus on delivering solutions that create measurable
                  business value.
                </p>
              </StaggerItem>

              <StaggerItem>
                <p>
                  With a strong foundation in software engineering, machine learning, and cloud-native
                  architectures, I enjoy building intelligent products that bridge the gap between
                  cutting-edge AI innovation and practical business needs. Whether it&apos;s developing
                  autonomous AI workflows, optimizing knowledge retrieval systems, or creating seamless
                  user experiences powered by large language models, I am driven by the challenge of
                  turning complex ideas into scalable, real-world applications.
                </p>
              </StaggerItem>
            </StaggerContainer>

            {/* Strengths — fills right-column space below bio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-50px" }}
              transition={{ duration: 0.8, ease: smoothEase }}
            >
              <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3" fast>
                {strengths.map((strength) => (
                  <StaggerItem key={strength.label} className="h-full">
                    <motion.div
                      whileHover={{
                        y: -4,
                        scale: 1.03,
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderColor: "rgba(255,138,77,0.3)",
                        transition: { duration: 0.3, ease: smoothEase }
                      }}
                      className="glass-card p-4 text-center cursor-default group h-full flex flex-col items-center justify-start"
                    >
                      <motion.div
                        className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mx-auto mb-2 group-hover:bg-warm-accent/10 transition-colors duration-300"
                        whileHover={{ rotate: 360, scale: 1.15 }}
                        transition={{ duration: 0.6 }}
                      >
                        <strength.icon className="w-4 h-4 text-white/40 group-hover:text-warm-accent transition-colors" />
                      </motion.div>
                      <h4 className="text-sm text-white/80 group-hover:text-white transition-colors leading-snug"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {strength.label}
                      </h4>
                      <p className="text-[11px] text-white/30 mt-1 leading-snug">{strength.desc}</p>
                    </motion.div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </motion.div>
          </motion.div>
        </div>

        {/* Tech Stack — horizontal layout using full width */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.8, ease: smoothEase }}
          className="glass-card rounded-2xl p-5 md:p-6 overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-warm-accent/5 via-transparent to-electric-cyan/5 pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-4 md:mb-5">
              <div className="w-8 h-8 rounded-lg bg-warm-accent/10 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-warm-accent" />
              </div>
              <h4 className="text-sm tracking-[0.15em] uppercase text-white/70"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Tech Stack
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
              {techStack.map((group, groupIdx) => (
                <motion.div
                  key={group.category}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.5, delay: 0.08 * groupIdx, ease: smoothEase }}
                  className="min-w-0"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <group.icon className={`w-3 h-3 shrink-0 ${group.textColor}`} />
                    <span className={`text-[10px] tracking-[0.15em] uppercase font-medium ${group.textColor}`}>
                      {group.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.skills.map((skill, i) => (
                      <motion.span
                        key={skill}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.3, delay: 0.08 * groupIdx + 0.04 * i }}
                        whileHover={{ scale: 1.08, y: -1 }}
                        className={`px-2 py-0.5 rounded-md text-[10px] tracking-wide bg-gradient-to-r ${group.color} border ${group.borderColor} text-white/70 hover:text-white cursor-default transition-colors`}
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
