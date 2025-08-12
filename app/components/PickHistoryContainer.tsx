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

const mapDispatchToProps = (dispatch: any) => ({
  addPlayer: (player: IPlayer) => dispatch(teamActions.onPickPlayer(player)),
  removePlayer: (player: IPlayer) => dispatch(playerActions.onRemovePlayer(player)),
  movePlayer: (player: IPlayer, newIndex: number) => {
    // This would need a proper action if drag-and-drop reordering is implemented
    console.log('Move player not implemented:', player, newIndex);
  },
  updateTeam: (team: ITeam) => {
    // This would need a proper action for team updates
    console.log('Update team not implemented:', team);
  },
});

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
