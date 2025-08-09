import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import { IPlayer } from '../lib/models/Player';
import { ITeam } from '../lib/models/Team';
import PlayerTable from './PlayerTable';
import * as playerActions from '../lib/store/actions/players';
import * as teamActions from '../lib/store/actions/teams';

const mapStateToProps = (state) => ({
  players: state.players,
  teams: state.teams,
  scoring: state.scoring,
});

const mapDispatchToProps = {
  addPlayer: playerActions.addPlayer,
  removePlayer: playerActions.removePlayer,
  movePlayer: playerActions.movePlayer,
  updateTeam: teamActions.updateTeam,
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
