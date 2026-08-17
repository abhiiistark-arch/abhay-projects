"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { smoothEase } from "../components/AnimatedSection";

const projects = [
  {
    id: "01",
    title: "Anne",
    subtitle: "AI Voice Bot for Automotive CRM",
    tech: "LiveKit • LLM • RTC",
    year: "2025",
    desc: "Real-time conversational AI for car dealerships handling inbound/outbound leads with seamless CRM synchronization.",
    image: "https://images.unsplash.com/photo-1720962158937-7ea890052166?auto=format&w=800&q=80",
  },
  {
    id: "02",
    title: "Smriti",
    subtitle: "RAG-Based Conversational AI",
    tech: "LangChain • Bedrock • Foundry",
    year: "2024",
    desc: "Advanced RAG system with persistent memory for complex legal document processing and enterprise workflow grounding.",
    image: "https://images.unsplash.com/photo-1720962158789-9389a4f399da?auto=format&w=800&q=80",
  },
  {
    id: "03",
    title: "Vision-QC",
    subtitle: "Material Quality Vision Pipeline",
    tech: "PyTorch • YOLO • OpenCV",
    year: "2025",
    desc: "High-accuracy computer vision pipeline detecting material quality in real-time for industrial data management systems.",
    image: "https://images.unsplash.com/photo-1771873680097-7506773a2b02?auto=format&w=800&q=80",
  },
];

export function ProjectsSection() {
  return (
    <section id="projects" className="py-48 px-6 md:px-12 lg:px-24 bg-[#111111] overflow-hidden relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-40 gap-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: smoothEase }}
          >
            <h2 className="font-serif text-7xl sm:text-9xl italic leading-none tracking-tighter">
              Selected <br /> <span className="text-white/10 mix-blend-screen">Works.</span>
            </h2>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 0.3, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="font-mono-meta text-right max-w-xs leading-loose"
          >
            Hover items to deconstruct the geometry. Each project is a milestone in technical exploration and architectural precision.
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-48 gap-x-16 sm:px-12">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, delay: index * 0.15, ease: smoothEase }}
              className={`diamond-grid-item aspect-square group ${index === 1 ? 'lg:mt-40' : ''}`}
            >
              <div className="diamond-inner w-full h-full glass-card cursor-pointer relative shadow-2xl">
                <div className="diamond-content w-full h-full relative">
                  <Image 
                    src={project.image} 
                    alt={project.title} 
                    fill 
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100 contrast-125" 
                  />
                  
                  {/* Hover Overlay - Noir Details */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col justify-end p-10">
                     <div className="font-mono-meta text-warm-accent mb-3 tracking-[0.3em] text-[10px]">{project.year} // SYSTEM ACTIVE</div>
                     <h3 className="font-serif text-5xl text-white tracking-tighter mix-blend-difference">{project.title}</h3>
                     <div className="w-12 h-px bg-white/30 my-5 group-hover:w-full transition-all duration-1000" />
                     <p className="text-white/50 text-xs font-sans max-w-xs leading-relaxed opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 delay-200">
                       {project.desc}
                     </p>
                  </div>
                </div>
              </div>
              
              {/* Labels beneath diamond - The Ledger Style */}
              <div className="mt-16 text-center md:text-left relative">
                <div className="font-mono-meta text-white/20 mb-4 tracking-[0.4em] text-[9px] flex items-center gap-3">
                  {project.id} // LOG
                  <div className="h-px w-8 bg-white/10" />
                </div>
                <h3 className="font-serif text-4xl text-white/70 group-hover:text-white transition-all duration-500 tracking-tight">
                  {project.subtitle}
                </h3>
                <p className="font-mono-meta text-[10px] text-warm-accent/40 mt-3 group-hover:text-warm-accent transition-colors">
                  {project.tech}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Decorative Gradient Shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
    </section>
  );
}
