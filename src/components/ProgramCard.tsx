import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Clock, Sparkles } from "lucide-react";
import { useState } from "react";
import { SignupModal } from "./SignupModal";
import { analytics } from "@/hooks/useAnalytics";

interface ProgramCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  image: string;
  color: string;
  features: string[];
  capacity?: string;
  duration?: string;
  ageGroup?: string;
}

export const ProgramCard = ({
  icon: Icon,
  title,
  description,
  image,
  color,
  features,
  capacity,
  duration,
  ageGroup,
}: ProgramCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const handleEnroll = () => {
    setShowSignup(true);
    analytics.trackButtonClick('Enroll Now', `Program - ${title}`);
  };

  return (
    <>
      <Card 
        className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/60 transition-all duration-500 h-full flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
        
        {/* Image section */}
        <div className="relative h-56 overflow-hidden">
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${color} opacity-40 group-hover:opacity-20 transition-opacity duration-500`} />
          
          {/* Floating icon */}
          <div className={`absolute top-6 left-6 w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-xl transform transition-all duration-500 ${
            isHovered ? 'scale-110 rotate-12' : 'scale-100 rotate-0'
          }`}>
            <Icon className="w-8 h-8 text-foreground" />
          </div>

          {/* Age group badge */}
          {ageGroup && (
            <Badge className="absolute top-6 right-6 bg-card/90 backdrop-blur-sm text-foreground border border-primary/30">
              <Sparkles className="w-3 h-3 mr-1" />
              {ageGroup}
            </Badge>
          )}
        </div>
        
        {/* Content section */}
        <div className="p-8 flex-1 flex flex-col relative z-10">
          <h3 className="text-3xl font-orbitron font-bold mb-3 text-foreground group-hover:gradient-text transition-all duration-300">
            {title}
          </h3>
          
          <p className="text-muted-foreground font-space leading-relaxed text-base mb-6">
            {description}
          </p>

          {/* Meta info */}
          {(capacity || duration) && (
            <div className="flex flex-wrap gap-3 mb-6">
              {capacity && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{capacity}</span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-accent" />
                  <span>{duration}</span>
                </div>
              )}
            </div>
          )}

          {/* Features list */}
          <div className="mb-6 flex-1">
            <div className="grid grid-cols-2 gap-2">
              {features.slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${color}`} />
                  <span className="text-xs text-muted-foreground font-space">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleEnroll}
            variant="outline"
            className="w-full group/btn border-2 hover:border-primary/80 relative overflow-hidden"
          >
            <span className={`absolute inset-0 bg-gradient-to-r ${color} opacity-0 group-hover/btn:opacity-20 transition-opacity duration-300`} />
            <span className="relative flex items-center justify-center gap-2">
              Enroll Now
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </span>
          </Button>
        </div>

        {/* Hover glow effect */}
        <div className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${color} rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-all duration-700`} />
      </Card>

      <SignupModal 
        open={showSignup} 
        onOpenChange={setShowSignup} 
        source={`program_${title.toLowerCase().replace(/\s+/g, '_')}`}
      />
    </>
  );
};
