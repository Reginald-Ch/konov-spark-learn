import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Clock, CheckCircle2, Zap } from "lucide-react";
import { useState } from "react";
import { SignupModal } from "./SignupModal";
import { analytics } from "@/hooks/useAnalytics";
import { motion } from "framer-motion";

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
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        whileHover={{ y: -8 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Card className="group relative overflow-hidden bg-card/50 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/60 transition-all duration-500 h-full flex flex-col">
          {/* Animated gradient overlay */}
          <motion.div 
            className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0`}
            animate={{ opacity: isHovered ? 0.15 : 0 }}
            transition={{ duration: 0.4 }}
          />
          
          {/* Floating particles effect */}
          {isHovered && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${color}`}
                  initial={{ 
                    x: Math.random() * 100 + '%', 
                    y: '100%',
                    opacity: 0 
                  }}
                  animate={{ 
                    y: '-20%',
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Image section with parallax effect */}
          <div className="relative h-40 overflow-hidden">
            <motion.img
              src={image} 
              alt={title}
              className="w-full h-full object-cover"
              animate={{ 
                scale: isHovered ? 1.15 : 1,
                rotate: isHovered ? 2 : 0
              }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            <motion.div 
              className={`absolute inset-0 bg-gradient-to-t ${color}`}
              animate={{ opacity: isHovered ? 0.2 : 0.4 }}
              transition={{ duration: 0.5 }}
            />
            
            {/* Floating icon with 3D effect */}
            <motion.div 
              className={`absolute top-4 left-4 w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-xl`}
              animate={{ 
                scale: isHovered ? 1.15 : 1,
                rotate: isHovered ? 12 : 0,
                y: isHovered ? -4 : 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div
                animate={{ rotate: isHovered ? 360 : 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                <Icon className="w-6 h-6 text-foreground" />
              </motion.div>
            </motion.div>

            {/* Age group badge with slide animation */}
            {ageGroup && (
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="absolute top-4 right-4"
              >
                <Badge className="bg-card/90 backdrop-blur-sm text-foreground border border-primary/30 text-xs px-2 py-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                  {ageGroup}
                </Badge>
              </motion.div>
            )}

            {/* Shine effect on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
              animate={{ 
                x: isHovered ? ['0%', '200%'] : '0%',
                opacity: isHovered ? [0, 0.3, 0] : 0
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </div>
          
          {/* Content section */}
          <div className="p-5 flex-1 flex flex-col relative z-10">
            <h3 
              className={`text-xl font-orbitron font-bold mb-2 transition-all duration-400 ${
                isHovered ? 'gradient-text' : 'text-foreground'
              }`}
            >
              {title}
            </h3>
            
            <p className="text-muted-foreground font-space leading-relaxed text-sm mb-4">
              {description}
            </p>

            {/* Meta info with stagger animation */}
            {(capacity || duration) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {capacity && (
                  <motion.div 
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>{capacity}</span>
                  </motion.div>
                )}
                {duration && (
                  <motion.div 
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>{duration}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Features list with stagger */}
            <div className="mb-4 flex-1">
              <div className="grid grid-cols-2 gap-1.5">
                {features.slice(0, 4).map((feature, idx) => (
                  <motion.div 
                    key={idx}
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.4 }}
                    whileHover={{ x: 4 }}
                  >
                    <motion.div 
                      className={`w-1 h-1 rounded-full bg-gradient-to-r ${color}`}
                      animate={{ scale: isHovered ? [1, 1.5, 1] : 1 }}
                      transition={{ duration: 1, repeat: Infinity, delay: idx * 0.2 }}
                    />
                    <span className="text-[11px] text-muted-foreground font-space">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA Button with magnetic effect */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleEnroll}
                variant="outline"
                className="w-full group/btn border hover:border-primary/80 relative overflow-hidden text-sm py-2"
              >
                <motion.span 
                  className={`absolute inset-0 bg-gradient-to-r ${color}`}
                  initial={{ x: '-100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ opacity: 0.2 }}
                />
                <span className="relative flex items-center justify-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Enroll Now
                  <motion.div
                    animate={{ x: isHovered ? [0, 4, 0] : 0 }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </motion.div>
                </span>
              </Button>
            </motion.div>
          </div>

          {/* Corner glow effect */}
          <motion.div 
            className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${color} rounded-full blur-3xl`}
            animate={{ 
              opacity: isHovered ? 0.4 : 0,
              scale: isHovered ? 1.2 : 1
            }}
            transition={{ duration: 0.7 }}
          />

          {/* Top corner sparkle */}
          <motion.div 
            className="absolute top-4 right-4 pointer-events-none"
            animate={{ 
              rotate: isHovered ? 360 : 0,
              scale: isHovered ? 1 : 0
            }}
            transition={{ duration: 0.8 }}
          >
            <CheckCircle2 className={`w-6 h-6 text-secondary`} />
          </motion.div>
        </Card>
      </motion.div>

      <SignupModal 
        open={showSignup} 
        onOpenChange={setShowSignup} 
        source={`program_${title.toLowerCase().replace(/\s+/g, '_')}`}
      />
    </>
  );
};
