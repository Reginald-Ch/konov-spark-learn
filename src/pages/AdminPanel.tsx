import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// This used to be a full standalone admin UI with its own login, tabs, and
// data-fetching — a parallel copy of everything the Judge Dashboard sub-view
// (inside /hackathons) already does. The two drifted out of sync over time
// (this page never got a Gallery Judging tab; the other page's Feedback tab
// only just got ported over to make sure nothing was lost in this merge —
// see JudgeDashboardPanel.tsx) rather than kept in parity, so instead of
// fixing the drift again, this just redirects to the one real interface,
// the same way the older standalone /judge page already redirects here.
const AdminPanel = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/hackathons?section=judge', { replace: true });
  }, [navigate]);

  return null;
};

export default AdminPanel;
