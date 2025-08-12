import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import { IPlayer } from '../lib/models/Player';
import { ITeam } from '../lib/models/Team';
import { IStoreState } from '../lib/store/store';
import PlayerTable from './PlayerTable';
import * as playerActions from '../lib/store/actions/players';
import * as teamActions from '../lib/store/actions/teams';

interface PlayerTableContainerProps {
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
  scoring: any;
  mobile?: boolean;
}

const mapStateToProps = (state: IStoreState) => ({
  players: {
    QB: state.undraftedPlayers.filter(p => p.pos === 'QB'),
    RB: state.undraftedPlayers.filter(p => p.pos === 'RB'),
    WR: state.undraftedPlayers.filter(p => p.pos === 'WR'),
    TE: state.undraftedPlayers.filter(p => p.pos === 'TE'),
    FLEX: state.undraftedPlayers.filter(p => ['RB', 'WR', 'TE'].includes(p.pos || '')),
    K: state.undraftedPlayers.filter(p => p.pos === 'K'),
    DST: state.undraftedPlayers.filter(p => p.pos === 'DST'),
  },
  teams: state.teams,
  scoring: state.scoring,
});

const mapDispatchToProps = {
  addPlayer: playerActions.onRemovePlayer, // This seems backwards but matches your usage
  removePlayer: playerActions.onRemovePlayer,
  movePlayer: (player: IPlayer, newIndex: number) => ({ type: 'MOVE_PLAYER', player, newIndex }),
  updateTeam: teamActions.setTrackedTeam,
};

const ConnectedPlayerTableContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(PlayerTable);

const PlayerTableWrapper: React.FC<{ mobile?: boolean }> = ({ mobile }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <ConnectedPlayerTableContainer mobile={mobile} />
    </DndProvider>
  );
};

export default PlayerTableWrapper;
