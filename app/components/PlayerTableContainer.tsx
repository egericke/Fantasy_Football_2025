import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { connect } from 'react-redux';
import { IPlayer } from '../lib/models/Player';
import { IPlayers } from '../lib/models/Players';
import { ITeam } from '../lib/models/Team';
import { IScoring } from '../lib/models/Scoring';
import PlayerTable from './PlayerTable';
import * as playerActions from '../lib/store/actions/players';
import * as teamActions from '../lib/store/actions/teams';

interface IPlayerTableContainerProps {
  players: IPlayers;
  teams: ITeam[];
  scoring: IScoring;
  addPlayer: (player: IPlayer) => void;
  removePlayer: (player: IPlayer) => void;
  movePlayer: (player: IPlayer, newIndex: number) => void;
  updateTeam: (team: ITeam) => void;
}

const PlayerTableContainer: React.FC<IPlayerTableContainerProps> = ({
  players,
  teams,
  scoring,
  addPlayer,
  removePlayer,
  movePlayer,
  updateTeam,
}) => {
  const { QB, RB, WR, TE, FLEX, K, DST } = teams.reduce(
    (acc, t) => {
      const { QB, RB, WR, TE, FLEX, K, DST } = t;
      return {
        QB: [...acc.QB, ...QB],
        RB: [...acc.RB, ...RB],
        WR: [...acc.WR, ...WR],
        TE: [...acc.TE, ...TE],
        FLEX: [...acc.FLEX, ...FLEX],
        K: [...acc.K, ...K],
        DST: [...acc.DST, ...DST],
      };
    },
    { QB: [], RB: [], WR: [], TE: [], FLEX: [], K: [], DST: [] },
  );

  const byeWeeks = [...QB, ...RB, ...WR, ...TE, ...FLEX].reduce(
    (acc, p) => ({ ...acc, [p.Team]: p.byeWeek }),
    {},
  );

  const rbHandcuffTeams = [...RB, ...FLEX]
    .filter((p: IPlayer) => p && p.pos === 'RB')
    .reduce((acc, p: IPlayer) => ({ ...acc, [p.Team]: true }), {});

  return {
    byeWeeks,
    rbHandcuffTeams,
    addPlayer,
    removePlayer,
    movePlayer,
    updateTeam,
    teams,
    scoring,
    players: {
      ...players,
      FLEX: players.FLEX.map((p) => {
        if (p.pos === 'RB') {
          return {
            ...p,
            isHandcuff: !!rbHandcuffTeams[p.Team],
          };
        }
        return p;
      }),
      RB: players.RB.map((p) => ({
        ...p,
        isHandcuff: !!rbHandcuffTeams[p.Team],
      })),
    },
  };
};

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

const PlayerTableWrapper: React.FC = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <ConnectedPlayerTableContainer />
    </DndProvider>
  );
};

export default PlayerTableWrapper;
