"use client";

import { motion } from "framer-motion";
import { Mic, BookOpen, TreePine, Bot, Layers } from "lucide-react";
import { smoothEase, StaggerContainer, StaggerItem } from "../components/AnimatedSection";

const projects = [
  {
    id: "anne",
    title: "Anne",
    subtitle: "AI Voice Bot for Automotive CRM",
    description: "A real-time AI voice bot built with LiveKit, serving as the core conversational layer within a car dealership CRM. Enables low-latency voice conversations with speech-to-text, text-to-speech, and LLM-driven dialogue orchestration.",
    tags: ["LiveKit", "Speech-to-Text", "LLM Orchestration", "CRM Integration", "Real-time"],
    icon: Mic,
    color: "from-warm-accent/20 to-amber-500/10",
  },
  {
    id: "smriti",
    title: "Smriti",
    subtitle: "RAG-Based Conversational AI",
    description: "A Retrieval-Augmented Generation chatbot using LangChain with persistent memory, delivering accurate, context-aware answers over structured and unstructured legal documents. Integrates Microsoft Foundry with AWS Bedrock.",
    tags: ["LangChain", "RAG", "Microsoft Foundry", "AWS Bedrock", "Vector Search", "Legal AI"],
    icon: BookOpen,
    color: "from-electric-cyan/20 to-blue-500/10",
  },
  {
    id: "forest-vision",
    title: "Forest Vision",
    subtitle: "Computer Vision for Environmental AI",
    description: "An end-to-end computer vision pipeline for satellite and drone imagery that performs automated tree counting and species classification. Uses YOLOv8 for bounding-box detection and U-Net for semantic segmentation with IoU-based evaluation. A custom CNN architecture alongside VGG16, ResNet50, and EfficientNet classifies tree species with high accuracy, powering real-time environmental monitoring at scale.",
    tags: ["YOLOv8", "U-Net", "ResNet50", "EfficientNet", "OpenCV", "Semantic Segmentation", "Drone Imagery"],
    icon: TreePine,
    color: "from-emerald-500/20 to-green-500/10",
  },
  {
    id: "api-agent-tester",
    title: "AI Agent API Tester",
    subtitle: "Autonomous API Validation with AI Agents",
    description: "An intelligent API endpoint testing framework powered by autonomous AI agents and Composio. Agents systematically discover, call, and validate REST API endpoints — verifying response schemas, status codes, and edge cases without manual scripting. The system automatically classifies endpoints as valid or invalid, generates detailed test reports, and flags anomalies, turning hours of manual QA into minutes of agentic automation.",
    tags: ["Composio", "AI Agents", "REST API", "Automated Testing", "LangChain", "Validation"],
    icon: Bot,
    color: "from-purple-500/20 to-pink-500/10",
  },
  {
    id: "smart-dedup",
    title: "Smart Deduplication",
    subtitle: "Unsupervised ML for Large-Scale Record Linkage",
    description: "A high-performance entity resolution engine built on the Splink library that deduplicates billions of records in minutes using the Fellegi-Sunter probabilistic linkage model. The system trains unsupervised on unlabelled data to learn match weights, then applies blocking rules and pairwise comparisons at massive scale. Features rich interactive visualizations — waterfall charts, precision-recall curves, and cluster graphs — that make complex deduplication decisions transparent and auditable.",
    tags: ["Splink", "Fellegi-Sunter", "PySpark", "Unsupervised ML", "Entity Resolution", "Data Quality"],
    icon: Layers,
    color: "from-blue-500/20 to-indigo-500/10",
  },
];

export function ProjectsSection() {
  return (
    <section id="projects" className="relative bg-rich-charcoal py-32 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02]"
        style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

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
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>02</span>
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
            Projects
          </motion.h2>
        </div>

        {/* Projects - STAGGERED CURTAIN REVEAL */}
        <StaggerContainer className="space-y-24">
          {projects.map((project, index) => (
            <StaggerItem key={project.id}>
              <ProjectCard project={project} index={index} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function ProjectCard({ project, index }: { project: typeof projects[0]; index: number }) {
  const isReversed = index % 2 === 1;

  return (
    <motion.article
      className="group relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center"
      initial="rest"
      whileHover="hover"
    >
      {/* Image - CURTAIN SLIDE FROM SIDE */}
      <motion.div
        className={`relative aspect-[16/10] rounded-2xl overflow-hidden ${isReversed ? "lg:order-2" : ""}`}
        initial={{ opacity: 0, x: isReversed ? 60 : -60, scale: 0.95 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 0.9, ease: smoothEase }}
        whileHover={{ scale: 1.02 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br"
          style={{ background: `linear-gradient(135deg, ${project.color.includes('warm') ? 'rgba(255,138,77,0.1)' : project.color.includes('cyan') ? 'rgba(0,245,255,0.1)' : 'rgba(168,85,247,0.1)'}, transparent)` }} />
        <div className="absolute inset-0 bg-rich-charcoal/40" />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div className="relative"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.15, rotate: 5 } }}
            transition={{ duration: 0.5, ease: smoothEase }}>
            <project.icon className="w-20 h-20 text-white/10" />
            <motion.div className="absolute inset-0 flex items-center justify-center"
              variants={{ rest: { opacity: 0, scale: 0.8 }, hover: { opacity: 0.4, scale: 1 } }}
              transition={{ duration: 0.4 }}>
              <project.icon className="w-20 h-20 text-warm-accent" />
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-deep-space/80 via-transparent to-transparent" />
        <div className="absolute top-6 left-6">
          <span className="text-6xl font-light text-white/5"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}>0{index + 1}</span>
        </div>
        <motion.div className="absolute inset-0 bg-warm-accent/5"
          variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
          transition={{ duration: 0.5 }} />
      </motion.div>

      {/* Content - CURTAIN SLIDE FROM OPPOSITE SIDE */}
      <motion.div
        className={`space-y-6 ${isReversed ? "lg:order-1 lg:text-right" : ""}`}
        initial={{ opacity: 0, x: isReversed ? -60 : 60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 0.9, delay: 0.15, ease: smoothEase }}
        variants={{ rest: { x: 0 }, hover: { x: isReversed ? -8 : 8 } }}
      >
        <div>
          <motion.h3
            className="text-3xl md:text-4xl font-light text-white mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            variants={{ rest: { color: "rgba(255,255,255,1)" }, hover: { color: "rgba(255,138,77,1)" } }}
            transition={{ duration: 0.3 }}
          >
            {project.title}
          </motion.h3>
          <p className="text-sm text-white/40 tracking-wide uppercase">{project.subtitle}</p>
        </div>

        <p className="text-white/50 leading-relaxed text-sm md:text-base max-w-lg">{project.description}</p>

        {/* Tags - STAGGERED POP UP */}
        <div className={`flex flex-wrap gap-2 ${isReversed ? "lg:justify-end" : ""}`}>
          {project.tags.map((tag, i) => (
            <motion.span
              key={tag}
              className="px-3 py-1.5 rounded-full text-xs bg-white/5 text-white/50 border border-white/10 hover:border-warm-accent/30 hover:text-white/70 transition-all duration-300"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: smoothEase }}
              whileHover={{ scale: 1.1, y: -2 }}
            >
              {tag}
            </motion.span>
          ))}
        </div>

      </motion.div>
    </motion.article>
  );
}
