import * as React from 'react';
import { IPlayer } from '../lib/models/Player';
import { IPlayers } from '../lib/models/Players';
import { ITeam } from '../lib/models/Team';
import { IScoring } from '../lib/models/Scoring';
import PlayerTableRow from './PlayerTableRow';

interface IPlayerTableProps {
  players: IPlayers;
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
}) => {
  const { QB, RB, WR, TE, FLEX, K, DST } = players;
  return (
    <div className="player-table">
      <div className="player-table-position">
        <h2>QB</h2>
        {QB.map((p, i) => (
          <PlayerTableRow
            key={p.id}
            index={i}
            player={p}
            scoring={scoring}
            onDrop={movePlayer}
          />
        ))}
      </div>
      <div className="player-table-position">
        <h2>RB</h2>
        {RB.map((p, i) => (
          <PlayerTableRow
            key={p.id}
            index={i}
            player={p}
            scoring={scoring}
            onDrop={movePlayer}
          />
        ))}
      </div>
      <div className="player-table-position">
        <h2>WR</h2>
        {WR.map((p, i) => (
          <PlayerTableRow
            key={p.id}
            index={i}
            player={p}
            scoring={scoring}
            onDrop={movePlayer}
          />
        ))}
      </div>
      <div className="player-table-position">
        <h2>TE</h2>
        {TE.map((p, i) => (
          <PlayerTableRow
            key={p.id}
            index={i}
            player={p}
            scoring={scoring}
            onDrop={movePlayer}
          />
        ))}
      </div>
      <div className="player-table-position">
        <h2>FLEX</h2>
        {FLEX.map((p, i) => (
          <PlayerTableRow
            key={p.id}
            index={i}
            player={p}
            scoring={scoring}
            onDrop={movePlayer}
          />
        ))}
      </div>
      <div className="player-table-position">
        <h2>K</h2>
        {K.map((p, i) => (
          <PlayerTableRow
            key={p.id}
            index={i}
            player={p}
            scoring={scoring}
            onDrop={movePlayer}
          />
        ))}
      </div>
      <div className="player-table-position">
        <h2>DST</h2>
        {DST.map((p, i) => (
          <PlayerTableRow
            key={p.id}
            index={i}
            player={p}
            scoring={scoring}
            onDrop={movePlayer}
          />
        ))}
      </div>
    </div>
  );
};

export default PlayerTable;
