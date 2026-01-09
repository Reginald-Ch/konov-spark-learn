import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const getStatusColor = () => {
    switch (hackathon.status) {
      case 'live':
        return 'bg-green-500 text-white animate-pulse';
      case 'upcoming':
        return 'bg-primary text-primary-foreground';
      case 'ended':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted';
    }
  };

  const getCountdownLabel = () => {
    if (hackathon.status === 'upcoming') {
      return 'Starts in';
    } else if (hackathon.status === 'live') {
      return 'Ends in';
    }
    return '';
  };

  const getCountdownDate = () => {
    if (hackathon.status === 'upcoming') {
      return startDate;
    } else if (hackathon.status === 'live') {
      return endDate;
    }
    return new Date();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getStatusColor()}>
                  {hackathon.status === 'live' && <Zap className="w-3 h-3 mr-1" />}
                  {hackathon.status.toUpperCase()}
                </Badge>
                {hackathon.theme && (
                  <Badge variant="outline">{hackathon.theme}</Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{hackathon.title}</CardTitle>
            </div>
            {hackathon.prizes && (
              <div className="flex items-center gap-1 text-primary">
                <Trophy className="w-5 h-5" />
                <span className="text-sm font-medium">Prizes</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {hackathon.description && (
            <p className="text-muted-foreground">{hackathon.description}</p>
          )}

          {hackathon.status !== 'ended' && (
            <CountdownTimer
              targetDate={getCountdownDate()}
              label={getCountdownLabel()}
            />
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{hackathon.current_participants}/{hackathon.max_participants} participants</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Registration: {format(registrationDeadline, 'MMM d, h:mm a')}</span>
            </div>
            <div className="flex items-center gap-2">
              {spotsLeft > 0 ? (
                <span className="text-green-600 font-medium">{spotsLeft} spots left</span>
              ) : (
                <span className="text-destructive font-medium">Full</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            {hackathon.status === 'upcoming' && isRegistrationOpen && (
              <Button onClick={() => onRegister(hackathon.id)} className="flex-1">
                Register Now
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => onViewTeams(hackathon.id)}
              className="flex-1"
            >
              View Teams
            </Button>
            {hackathon.status === 'live' && (
              <Button 
                variant="secondary" 
                onClick={() => onSubmitProject(hackathon.id)}
                className="flex-1"
              >
                Submit Project
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
