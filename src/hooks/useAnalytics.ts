import { useEffect } from 'react';

export type AnalyticsEvent = {
  category: string;
  action: string;
  label?: string;
  value?: number;
};

class Analytics {
  private static instance: Analytics;
  private events: AnalyticsEvent[] = [];

  private constructor() {}

  static getInstance(): Analytics {
    if (!Analytics.instance) {
      Analytics.instance = new Analytics();
    }
    return Analytics.instance;
  }

  track(event: AnalyticsEvent) {
    const timestamp = new Date().toISOString();
    const eventWithTimestamp = { ...event, timestamp };
    
    this.events.push(eventWithTimestamp);
    console.log('[Analytics]', eventWithTimestamp);
    
    // Store in localStorage for persistence
    try {
      const stored = localStorage.getItem('analytics_events') || '[]';
      const allEvents = JSON.parse(stored);
      allEvents.push(eventWithTimestamp);
      
      // Keep only last 100 events
      const recentEvents = allEvents.slice(-100);
      localStorage.setItem('analytics_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.error('[Analytics] Storage error:', error);
    }
  }

  trackPageView(path: string) {
    this.track({
      category: 'Page View',
      action: 'View',
      label: path,
    });
  }

  trackFormSubmission(formName: string, success: boolean) {
    this.track({
      category: 'Form',
      action: success ? 'Submit Success' : 'Submit Error',
      label: formName,
    });
  }

  trackButtonClick(buttonName: string, location: string) {
    this.track({
      category: 'Button',
      action: 'Click',
      label: `${buttonName} - ${location}`,
    });
  }

  trackMascotInteraction(interactionType: string) {
    this.track({
      category: 'Mascot',
      action: 'Interaction',
      label: interactionType,
    });
  }

  trackScrollDepth(depth: number) {
    this.track({
      category: 'Engagement',
      action: 'Scroll Depth',
      value: depth,
    });
  }

  getEvents() {
    return this.events;
  }
}

export const analytics = Analytics.getInstance();

export function usePageTracking(pageName: string) {
  useEffect(() => {
    analytics.trackPageView(pageName);
  }, [pageName]);
}

export function useScrollTracking() {
  useEffect(() => {
    let maxScroll = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPercent = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          );
          
          if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
            maxScroll = scrollPercent;
            analytics.trackScrollDepth(scrollPercent);
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}
