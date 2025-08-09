import React, { useState, useEffect } from 'react';

import Header from './Header';
import MobileSettings from './MobileSettings';
import PickHistoryContainer from './PickHistoryContainer';
import PlayerTableContainer from './PlayerTableContainer';
import RosterModal from './RosterModal';
import ScoringModal from './ScoringModal';
import Settings from './Settings';
import TeamPicks from './TeamPicks';

/**
 * Root component for the fantasy draft application.  Uses a functional
 * component with hooks to track whether the user is on a mobile device.  This
 * modern approach replaces the previous class component and avoids the
 * pitfalls of re‑binding methods and stale closures.
 */
export default function App() {
  // Determine if the application should render in mobile mode.  Use a
  // stateful variable and update it whenever the window is resized.
  const [mobile, setMobile] = useState<boolean>(false);

  useEffect(() => {
    // Helper to update mobile based on the current window width.
    const handleResize = () => setMobile(window.innerWidth < 700);
    // Set the initial state on mount.
    handleResize();
    // Listen for subsequent resizes.
    window.addEventListener('resize', handleResize);
    // Clean up the listener on unmount.
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // If it's on mobile, render only the team picker and PlayerTable with
  // condensed controls.
  if (mobile) {
    return (
      <div id="App">
        <MobileSettings />
        <TeamPicks mobile={true} />
        <PlayerTableContainer mobile={true} />

        <RosterModal />
        <ScoringModal />
      </div>
    );
  }

  return (
    <div id="App">
      <div className="App-Left-Column">
        <Header />
        <Settings />
        <TeamPicks />
      </div>
      <div className="App-Right-Column">
        <PickHistoryContainer />
        <PlayerTableContainer />
      </div>
      <RosterModal />
      <ScoringModal />
    </div>
  );
}
