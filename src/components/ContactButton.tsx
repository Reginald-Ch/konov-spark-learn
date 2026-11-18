import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContactButtonProps {
  label?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
}

// Sends visitors on the older pages to the Contact page, which lists every way to reach KONOV.
export const ContactButton = ({ label = "Contact Us", className, size = "lg" }: ContactButtonProps) => (
  <Button
    asChild
    size={size}
    className={cn(
      "font-fredoka font-bold rounded-full border-3 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:shadow-[5px_5px_0_hsl(var(--foreground))] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all bg-secondary text-white",
      className
    )}
  >
    <Link to="/contact">
      <MessageSquare className="w-5 h-5 mr-2" />
      {label}
    </Link>
  </Button>
);
