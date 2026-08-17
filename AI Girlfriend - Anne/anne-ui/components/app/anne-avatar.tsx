'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { useVoiceAssistant } from '@livekit/components-react';
import { cn } from '@/lib/shadcn/utils';

const STATUS_LABELS: Record<string, string> = {
  initializing: 'Connecting…',
  idle: 'Ready',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

interface AnneAvatarProps {
  compact?: boolean;
  className?: string;
}

export function AnneAvatar({ compact = false, className }: AnneAvatarProps) {
  const { state } = useVoiceAssistant();
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isActive = isSpeaking || isListening || isThinking;

  const sizeClass = compact
    ? 'h-[90px] w-[90px]'
    : 'h-[280px] w-[220px] sm:h-[360px] sm:w-[280px] md:h-[420px] md:w-[320px]';

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <motion.div
        animate={
          isSpeaking
            ? { scale: [1, 1.02, 1], boxShadow: ['0 0 0 0 rgba(107,143,113,0)', '0 0 24px 4px rgba(107,143,113,0.45)', '0 0 0 0 rgba(107,143,113,0)'] }
            : isListening
              ? { scale: [1, 1.01, 1] }
              : { scale: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
        }
        transition={
          isSpeaking
            ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
            : isListening
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.3 }
        }
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 bg-white shadow-xl dark:bg-zinc-900',
          isActive ? 'border-[#6B8F71]' : 'border-zinc-200 dark:border-zinc-700',
          sizeClass
        )}
      >
        <Image
          src="/anne.png"
          alt="Anne"
          fill
          priority
          className="object-cover object-top"
          sizes={compact ? '90px' : '(max-width: 768px) 280px, 320px'}
        />

        {/* Speaking waveform overlay */}
        {isSpeaking && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1 bg-gradient-to-t from-black/50 to-transparent px-4 py-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 rounded-full bg-[#8FB996]"
                animate={{ height: ['8px', '20px', '8px'] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Listening indicator */}
        {isListening && !isSpeaking && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/40 to-transparent py-2">
            <span className="rounded-full bg-[#6B8F71] px-3 py-0.5 text-xs font-medium text-white">
              Listening
            </span>
          </div>
        )}
      </motion.div>

      {!compact && (
        <p className="text-muted-foreground text-sm font-medium">
          {STATUS_LABELS[state] ?? 'Anne'}
        </p>
      )}
    </div>
  );
}
