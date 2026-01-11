import { motion } from 'framer-motion';
import { Calendar, Users, Clock, Trophy, Zap, ArrowRight, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from './CountdownTimer';
import { format } from 'date-fns';

interface HackathonCardProps {
  hackathon: {
    id: string;
    title: string;
    description: string | null;
    theme: string | null;
    start_date: string;
    end_date: string;
    registration_deadline: string;
    max_participants: number;
    current_participants: number;
    status: 'upcoming' | 'live' | 'ended';
    prizes: string | null;
  };
  onRegister: (hackathonId: string) => void;
  onViewTeams: (hackathonId: string) => void;
  onSubmitProject: (hackathonId: string) => void;
}

export const HackathonCard = ({ hackathon, onRegister, onViewTeams, onSubmitProject }: HackathonCardProps) => {
  const startDate = new Date(hackathon.start_date);
  const endDate = new Date(hackathon.end_date);
  const registrationDeadline = new Date(hackathon.registration_deadline);
  const now = new Date();
  
  const spotsLeft = hackathon.max_participants - hackathon.current_participants;
  const isRegistrationOpen = now < registrationDeadline && spotsLeft > 0;

  const getStatusStyles = () => {
    switch (hackathon.status) {
      case 'live':
        return {
          badge: 'bg-[hsl(var(--discord-red))] text-white border-0',
          glow: 'shadow-[0_0_20px_hsl(var(--discord-red)/0.4)]',
          border: 'border-[hsl(var(--discord-red)/0.5)]'
        };
      case 'upcoming':
        return {
          badge: 'bg-[hsl(var(--discord-blurple))] text-white border-0',
          glow: '',
          border: 'border-[hsl(var(--discord-blurple)/0.3)]'
        };
      case 'ended':
        return {
          badge: 'bg-[hsl(var(--discord-light))] text-[hsl(var(--discord-text-muted))] border-0',
          glow: '',
          border: 'border-[hsl(var(--discord-light)/0.3)]'
        };
      default:
        return { badge: '', glow: '', border: '' };
    }
  };

  const styles = getStatusStyles();

  const getCountdownLabel = () => {
    if (hackathon.status === 'upcoming') return 'Starts in';
    if (hackathon.status === 'live') return 'Ends in';
    return '';
  };

  const getCountdownDate = () => {
    if (hackathon.status === 'upcoming') return startDate;
    if (hackathon.status === 'live') return endDate;
    return new Date();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative rounded-lg overflow-hidden bg-[hsl(var(--discord-dark))] border ${styles.border} ${styles.glow} transition-all duration-300 group`}
    >
      {/* Live indicator pulse */}
      {hackathon.status === 'live' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C70110] via-[#F7941D] to-[#C70110] animate-pulse" />
      )}
      
      {/* Upcoming indicator with Konov colors */}
      {hackathon.status === 'upcoming' && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{
          background: 'linear-gradient(90deg, #C70110 0%, #F7941D 50%, #006600 100%)'
        }} />
      )}

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${styles.badge} text-xs font-medium`}>
              {hackathon.status === 'live' && <Zap className="w-3 h-3 mr-1 animate-pulse" />}
              {hackathon.status === 'live' && '🔴 '}
              {hackathon.status.toUpperCase()}
            </Badge>
            {hackathon.theme && (
              <Badge className="bg-[hsl(var(--discord-lighter))] text-[hsl(var(--discord-text))] border-0 text-xs">
                <Gamepad2 className="w-3 h-3 mr-1" />
                {hackathon.theme.length > 20 ? hackathon.theme.substring(0, 20) + '...' : hackathon.theme}
              </Badge>
            )}
          </div>
          {hackathon.prizes && (
            <div className="flex items-center gap-1 text-[hsl(var(--discord-yellow))]" title="Prizes available!">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium">Prizes</span>
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[hsl(var(--discord-blurple))] transition-colors line-clamp-2">
          {hackathon.title}
        </h3>

        {hackathon.description && (
          <p className="text-sm text-[hsl(var(--discord-text-muted))] line-clamp-2 mb-4">
            {hackathon.description}
          </p>
        )}
      </div>

      {/* Countdown */}
      {hackathon.status !== 'ended' && (
        <div className="px-4 pb-4">
          <CountdownTimer
            targetDate={getCountdownDate()}
            label={getCountdownLabel()}
          />
        </div>
      )}

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] bg-[hsl(var(--discord-darker))] rounded px-2 py-1.5">
            <Calendar className="w-3 h-3" />
            <span>{format(startDate, 'MMM d')} - {format(endDate, 'd')}</span>
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] bg-[hsl(var(--discord-darker))] rounded px-2 py-1.5">
            <Users className="w-3 h-3" />
            <span>{hackathon.current_participants}/{hackathon.max_participants}</span>
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--discord-text-muted))] bg-[hsl(var(--discord-darker))] rounded px-2 py-1.5">
            <Clock className="w-3 h-3" />
            <span>{format(registrationDeadline, 'MMM d')}</span>
          </div>
          <div className="flex items-center gap-2 bg-[hsl(var(--discord-darker))] rounded px-2 py-1.5">
            {spotsLeft > 0 ? (
              <span className="text-[hsl(var(--discord-green))] font-medium">{spotsLeft} spots</span>
            ) : (
              <span className="text-[hsl(var(--discord-red))] font-medium">Full</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {hackathon.status === 'upcoming' && isRegistrationOpen && (
          <Button 
            onClick={() => onRegister(hackathon.id)} 
            className="flex-1 text-white font-medium"
            style={{
              background: 'linear-gradient(135deg, #C70110 0%, #F7941D 100%)'
            }}
            size="sm"
          >
            Register Now
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        )}
        {hackathon.status === 'upcoming' && !isRegistrationOpen && spotsLeft > 0 && (
          <Badge className="flex-1 justify-center py-2 bg-[hsl(var(--discord-light))] text-[hsl(var(--discord-text-muted))]">
            Registration Closed
          </Badge>
        )}
        <Button 
          variant="outline" 
          onClick={() => onViewTeams(hackathon.id)}
          className="flex-1 border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light)/0.3)] hover:text-white"
          size="sm"
        >
          <Users className="w-4 h-4 mr-1" />
          Teams
        </Button>
        {hackathon.status === 'live' && (
          <Button 
            onClick={() => onSubmitProject(hackathon.id)}
            className="flex-1 font-medium text-white"
            style={{
              background: 'linear-gradient(135deg, #006600 0%, #00aa00 100%)'
            }}
            size="sm"
          >
            Submit Project
            <Zap className="w-4 h-4 ml-1" />
          </Button>
        )}
        {hackathon.status === 'ended' && (
          <Badge className="flex-1 justify-center py-2 bg-[hsl(var(--discord-light))] text-[hsl(var(--discord-text-muted))]">
            <Trophy className="w-3 h-3 mr-1" />
            Event Ended
          </Badge>
        )}
      </div>
    </motion.div>
  );
};