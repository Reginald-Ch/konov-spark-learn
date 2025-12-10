import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Lightbulb, Trophy } from "lucide-react";
import { useState } from "react";

export const SuccessStories = () => {
  const [activeStory, setActiveStory] = useState(0);

  const stories = [
    {
      name: "Damien, Age 9",
      location: "Accra, Ghana",
      achievement: "learnt how to train an AI ",
      icon: Lightbulb,
      color: "from-primary to-accent",
      story: "Damien learnt about datasets , learning algorithms and prediction and applied the concept by training computer to recognize  images.",
      project: "AI and Machine Learning",
      quote: "The lessons are fun and easy to understand!"
    },
    {
      name: "Kwasi & Nana Akua, Ages 10 & 8",
      location: "Accra, Ghana",
      achievement: "We know that how AI learns ",
      icon: Award,
      color: "from-accent to-secondary",
      story: "These siblings attended our Sworkshop. They learnt about how machines learn with patterns and  AI ethics .",
      project: "AI vrs Robots",
      quote: "We enjoyed the lessons and also we got to play with AI games!"
    },
    {
      name: "Jayden, Age 8",
      location: "Accra, Ghana",
      achievement: "Trained my AI to classify between images and objects",
      icon: Trophy,
      color: "from-secondary to-primary",
      story: "Jayden now as a good understand of AI fundamentals starting his journey as a AI young builder.",
      project: "I know how AI can be bias",
      quote: "I trained my AI with Datasets."
    },
  ];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-b from-background to-background/50">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-orbitron font-bold mb-6">
            Student <span className="gradient-text">Success Stories</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-space leading-relaxed">
            Real kids building real solutions with the skills they learned
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Story Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {stories.map((story, idx) => {
              const Icon = story.icon;
              return (
                <Card
                  key={idx}
                  onClick={() => setActiveStory(idx)}
                  className={`p-6 cursor-pointer transition-all duration-300 glow-card backdrop-blur-sm border ${
                    activeStory === idx
                      ? "bg-card/80 border-primary scale-105"
                      : "bg-card/40 border-primary/20 hover:border-primary/50"
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${story.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-7 h-7 text-foreground" />
                  </div>
                  <h3 className="text-xl font-orbitron font-bold mb-2 text-foreground">
                    {story.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-space mb-1">
                    {story.location}
                  </p>
                  <p className="text-sm font-space font-semibold gradient-text">
                    {story.achievement}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Detailed Story */}
          <Card className="p-8 md:p-12 glow-card bg-card/60 backdrop-blur-sm border border-primary/30">
            <div className="space-y-6">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-3xl font-orbitron font-bold mb-2 text-foreground">
                    {stories[activeStory].achievement}
                  </h3>
                  <p className="text-lg text-muted-foreground font-space">
                    {stories[activeStory].name} • {stories[activeStory].location}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-space font-semibold bg-gradient-to-r ${stories[activeStory].color} text-foreground`}>
                  {stories[activeStory].project}
                </span>
              </div>

              <p className="text-lg text-foreground font-space leading-relaxed">
                {stories[activeStory].story}
              </p>

              <div className="pl-6 border-l-4 border-primary/30">
                <p className="text-xl italic text-muted-foreground font-space leading-relaxed">
                  "{stories[activeStory].quote}"
                </p>
              </div>
            </div>
          </Card>

          <div className="text-center mt-12">
            <p className="text-muted-foreground font-space mb-6">
              Your child could be our next success story
            </p>
            <Button 
              size="lg"
              className="font-space font-semibold bg-gradient-to-r from-primary to-accent hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all duration-300"
            >
              Enroll Now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
