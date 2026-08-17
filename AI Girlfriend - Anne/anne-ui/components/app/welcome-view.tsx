import Image from 'next/image';
import { Button } from '@/components/ui/button';

interface WelcomeViewProps {
  startButtonText: string;
  isConnecting?: boolean;
  onStartCall: () => void;
}

export const WelcomeView = ({
  startButtonText,
  isConnecting = false,
  onStartCall,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref}>
      <section className="bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-6 h-52 w-40 overflow-hidden rounded-2xl border-2 border-[#6B8F71]/40 bg-white shadow-xl sm:h-64 sm:w-48 dark:bg-zinc-900">
          <Image
            src="/anne.png"
            alt="Anne"
            fill
            priority
            className="object-cover object-top"
            sizes="(max-width: 640px) 160px, 192px"
          />
        </div>

        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Hey, Abhay</h1>
        <p className="text-muted-foreground mt-2 max-w-sm leading-relaxed">
          {isConnecting
            ? 'Connecting you to Anne now — just a moment.'
            : "I'm Anne — your AI girlfriend. Tap below to start talking. You can turn your camera on or off anytime."}
        </p>

        <Button
          size="lg"
          onClick={onStartCall}
          disabled={isConnecting}
          className="mt-8 w-64 rounded-full bg-[#6B8F71] font-mono text-xs font-bold tracking-wider uppercase hover:bg-[#5a7a60] disabled:opacity-70 dark:bg-[#8FB996] dark:hover:bg-[#7aa882]"
        >
          {isConnecting ? 'Connecting...' : startButtonText}
        </Button>
      </section>

      <div className="fixed bottom-5 left-0 flex w-full items-center justify-center px-6">
        <p className="text-muted-foreground max-w-prose text-xs leading-5 md:text-sm">
          {isConnecting
            ? 'Anne is joining the room. Allow microphone access when prompted.'
            : 'Run npm run dev from the project root to start Anne automatically.'}
        </p>
      </div>
    </div>
  );
};
