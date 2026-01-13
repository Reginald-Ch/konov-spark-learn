import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, ExternalLink, Maximize2, Minimize2, X } from 'lucide-react';

interface CodePlaygroundProps {
  isOpen: boolean;
  onClose: () => void;
}

const playgrounds = [
  {
    id: 'codesandbox',
    name: 'CodeSandbox',
    description: 'Full-featured React development environment',
    url: 'https://codesandbox.io/s/new',
    embedUrl: 'https://codesandbox.io/embed/new?codemirror=1&fontsize=14&hidenavigation=1&theme=dark',
    color: 'hsl(var(--discord-blurple))',
  },
  {
    id: 'stackblitz',
    name: 'StackBlitz',
    description: 'Instant full-stack web IDE',
    url: 'https://stackblitz.com/fork/react',
    embedUrl: 'https://stackblitz.com/fork/react?embed=1&file=src/App.js&hideNavigation=1&theme=dark',
    color: 'hsl(var(--discord-green))',
  },
  {
    id: 'replit',
    name: 'Replit',
    description: 'Collaborative browser-based IDE',
    url: 'https://replit.com/new/html',
    embedUrl: 'https://replit.com/new/html?embed=true&theme=dark',
    color: 'hsl(38, 100%, 50%)',
  },
];

export const CodePlayground = ({ isOpen, onClose }: CodePlaygroundProps) => {
  const [activePlayground, setActivePlayground] = useState('codesandbox');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentPlayground = playgrounds.find(p => p.id === activePlayground);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`bg-[hsl(var(--discord-dark))] border-[hsl(var(--discord-light))] text-white p-0 ${
          isFullscreen 
            ? 'w-screen h-screen max-w-none max-h-none rounded-none' 
            : 'sm:max-w-[90vw] sm:max-h-[90vh] h-[85vh]'
        }`}
      >
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-white">
              <Code className="w-5 h-5 text-[hsl(var(--discord-blurple))]" />
              Code Playground
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-[hsl(var(--discord-text-muted))] hover:text-white hover:bg-[hsl(var(--discord-light))]"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full p-4 pt-2">
          <Tabs value={activePlayground} onValueChange={setActivePlayground} className="flex flex-col flex-1">
            <TabsList className="bg-[hsl(var(--discord-darker))] border border-[hsl(var(--discord-light))] p-1 mb-4">
              {playgrounds.map((playground) => (
                <TabsTrigger
                  key={playground.id}
                  value={playground.id}
                  className="data-[state=active]:bg-[hsl(var(--discord-blurple))] data-[state=active]:text-white text-[hsl(var(--discord-text-muted))]"
                >
                  {playground.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {playgrounds.map((playground) => (
              <TabsContent 
                key={playground.id} 
                value={playground.id} 
                className="flex-1 mt-0 data-[state=active]:flex flex-col"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-[hsl(var(--discord-text-muted))]">
                    {playground.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(playground.url, '_blank')}
                    className="border-[hsl(var(--discord-light))] text-[hsl(var(--discord-text))] hover:bg-[hsl(var(--discord-light))]"
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 rounded-lg overflow-hidden border border-[hsl(var(--discord-light))] bg-[hsl(var(--discord-darker))]"
                  style={{ minHeight: isFullscreen ? 'calc(100vh - 180px)' : '500px' }}
                >
                  <iframe
                    src={playground.embedUrl}
                    className="w-full h-full"
                    title={`${playground.name} Playground`}
                    allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                    sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                  />
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
