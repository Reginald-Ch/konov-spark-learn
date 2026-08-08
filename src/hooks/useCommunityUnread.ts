import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LAST_SEEN_KEY = 'forge-community-last-seen';

interface UnreadPreview {
  sender_name: string;
  content: string;
}

/**
 * Global, page-independent awareness of new community activity — Community
 * is a full page now (not a modal docked over whatever you're doing), so
 * this is what replaces the "you'll notice if it's open" behavior the modal
 * used to give for free. Subscribes regardless of which tab is active.
 */
export function useCommunityUnread(isViewingCommunity: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestPreview, setLatestPreview] = useState<UnreadPreview | null>(null);

  useEffect(() => {
    if (isViewingCommunity) {
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      setUnreadCount(0);
      setLatestPreview(null);
    }
  }, [isViewingCommunity]);

  // LAST_SEEN_KEY was written on every "seen" but never read anywhere —
  // the unread count only ever reflected messages that arrived live while
  // this hook happened to be mounted. Reload the page, or just reopen the
  // app after being away, and the badge silently reset to 0 even with a
  // real backlog waiting. Backfill once on mount from anything posted
  // since the last time Community was actually viewed.
  useEffect(() => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    // No stored timestamp means this is the first time this browser has
    // ever tracked "seen" state — counting all of history as unread would
    // show a huge, meaningless number for a brand new visitor.
    if (!lastSeen || isViewingCommunity) return;
    (async () => {
      const { data, count } = await supabase
        .from('community_messages')
        .select('sender_name, content, created_at', { count: 'exact' })
        .gt('created_at', lastSeen)
        .order('created_at', { ascending: false })
        .limit(1);
      if (count && count > 0) {
        setUnreadCount(count);
        if (data?.[0]) setLatestPreview({ sender_name: data[0].sender_name, content: data[0].content });
      }
    })();
    // Intentionally once-per-mount — this is a startup backfill, not
    // something that should re-run as isViewingCommunity toggles (the
    // live-subscription effect below already owns that ongoing tracking).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('global-community-unread')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages' },
        (payload) => {
          if (isViewingCommunity) {
            localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
            return;
          }
          const msg = payload.new as UnreadPreview;
          setUnreadCount((c) => c + 1);
          setLatestPreview({ sender_name: msg.sender_name, content: msg.content });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isViewingCommunity]);

  const dismissPreview = () => setLatestPreview(null);

  return { unreadCount, latestPreview, dismissPreview };
}
