import * as React from 'react';
import { IPlayer } from '../lib/models/Player';
import { ITeam } from '../lib/models/Team';
import { IScoring } from '../lib/models/Scoring';
import PlayerTableRow from './PlayerTableRow';

interface IPlayerTableProps {
  players: {
    QB: IPlayer[];
    RB: IPlayer[];
    WR: IPlayer[];
    TE: IPlayer[];
    FLEX: IPlayer[];
    K: IPlayer[];
    DST: IPlayer[];
  };
  teams: ITeam[];
  scoring: IScoring;
  addPlayer: (player: IPlayer) => void;
  removePlayer: (player: IPlayer) => void;
  movePlayer: (player: IPlayer, newIndex: number) => void;
  updateTeam: (team: ITeam) => void;
  mobile?: boolean;
}

const PlayerTable: React.FC<IPlayerTableProps> = ({
  players,
  teams,
  scoring,
  addPlayer,
  removePlayer,
  movePlayer,
  updateTeam,
  mobile = false,
}) => {
  const { QB, RB, WR, TE, FLEX, K, DST } = players;
  
  // Helper function to determine if position is valuable for current team
  const isValuablePosition = (player: IPlayer): boolean => {
    // Add your logic here based on teams/roster needs
    return true; // Simplified for now
  };

  const renderPlayerRows = (positionPlayers: IPlayer[]) => {
    return positionPlayers.map((player) => (
      <PlayerTableRow
        key={player.id || player.key}
        byeWeekConflict={false} // You can add logic here
        draftSoon={false} // You can add logic here  
        inValuablePosition={isValuablePosition(player)}
        mobile={mobile}
        onPickPlayer={addPlayer}
        player={player}
        rbHandcuff={false} // You can add logic here
        recommended={false} // You can add logic here
        onRemovePlayer={removePlayer}
      />
    ));
  };

  return (
    <div className="player-table">
      <div className="player-table-position">
        <h2>QB</h2>
        {renderPlayerRows(QB)}
      </div>
      <div className="player-table-position">
        <h2>RB</h2>
        {renderPlayerRows(RB)}
      </div>
      <div className="player-table-position">
        <h2>WR</h2>
        {renderPlayerRows(WR)}
      </div>
      <div className="player-table-position">
        <h2>TE</h2>
        {renderPlayerRows(TE)}
      </div>
      <div className="player-table-position">
        <h2>FLEX</h2>
        {renderPlayerRows(FLEX)}
      </div>
      <div className="player-table-position">
        <h2>K</h2>
        {renderPlayerRows(K)}
      </div>
      <div className="player-table-position">
        <h2>DST</h2>
        {renderPlayerRows(DST)}
      </div>
    </div>
  );
};

export default PlayerTable;
