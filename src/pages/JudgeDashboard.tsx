import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Judge Dashboard is now integrated into the Hackathons page as a sub-view.
// This page redirects there for backward compatibility.
const JudgeDashboard = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Navigate to hackathons page and the judge sub-view will be accessible from the sidebar
    navigate('/hackathons', { replace: true });
  }, [navigate]);

  return null;
};

export default JudgeDashboard;
