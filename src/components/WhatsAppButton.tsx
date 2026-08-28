import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// wa.me expects digits only, no "+" or spaces/parens, and no domestic
// trunk "0" (that's dropped in international dialing format).
const WHATSAPP_NUMBER = "233208741417";

interface WhatsAppButtonProps {
  message?: string;
  label?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

export const WhatsAppButton = ({
  message = "Hi KONOV Technologies! I'd like to learn more.",
  label = "Contact Us On WhatsApp",
  className,
  size = "lg",
}: WhatsAppButtonProps) => (
  <Button
    asChild
    size={size}
    className={cn(
      "font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-[#25D366] text-white",
      className
    )}
  >
    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
      <MessageSquare className="w-5 h-5 mr-2" />
      {label}
    </a>
  </Button>
);
