import * as React from 'react';
import { connect } from 'react-redux';
import { IPlayer, Position } from '../lib/models/Player';
import { IScoring } from '../lib/models/Scoring';
import { NullablePlayer } from '../lib/models/Team';
import { onRemovePlayer } from '../lib/store/actions/players';
import { onPickPlayer, skipPick, undoLast } from '../lib/store/actions/teams';
import { IStoreState } from '../lib/store/store';
import PlayerTable from './PlayerTable';

interface IPlayerTableProps {
  /**
   * Key is bye week number, value is whether there's a conflict with starter
   */
  byeWeeks: { [key: number]: boolean };
  currentPick: number;
  mobile?: boolean;
  undraftedPlayers: any[];
  onPickPlayer: (player: IPlayer) => void;

  /**
   * Key is the team name, defined for a team if there's a player on
   * the drafters roster that's an RB from that team
   */
  rbHandcuffTeams: { [key: string]: boolean };
  onRemovePlayer: (player: IPlayer) => void;

  scoring: IScoring;

  skip: () => void;
  undo: () => void;

  /**
   * Array of positions (key) and whether the drafter has NOT filled those positions.
   * True if it's still not filled (ie valuable)
   */
  valuedPositions: { [key: string]: boolean };
}

interface IPlayerTableState {
  /**
   * The name of the player the user is searching for.
   * Only show players with a similar name
   */
  nameFilter: string;

  /**
   * Only show players in these positions, hide the rest
   */
  positionsToShow: Position[];
}

/**
 * A table displaying all the undrafted players
 *
 * Includes buttons for skipping the current round, without a pick,
 * and undoing the last round/pick (in the event of a mistake)
 */
class PlayerTableContainer extends React.PureComponent<IPlayerTableProps, IPlayerTableState> {
  public static defaultProps = {
    mobile: false,
  };

  public state: IPlayerTableState = {
    nameFilter: '',
    positionsToShow: ['?'], // ? is a hackish flag for "ALL"
  };

  /** clear name filter after a player was picked */
  public componentDidUpdate = ({}, { nameFilter }: IPlayerTableState) => {
    if (nameFilter === this.state.nameFilter) {
      this.setState({ nameFilter: '' });
    }
  };

  public render() {
    const { currentPick, mobile, rbHandcuffTeams, scoring, undraftedPlayers: players, valuedPositions } = this.props;
    const { nameFilter, positionsToShow } = this.state;

    // players after filtering by position
    // array of booleans for whether not to show the player
    let filteredPlayers =
      positionsToShow.length === 1 && positionsToShow[0] === '?'
        ? new Array(players.length).fill(false)
        : players.map((p) => positionsToShow.indexOf(p.pos) < 0);

    // filter by the nameFilter (for name and team)
    const nameFilterLower = nameFilter.toLowerCase();
    if (nameFilterLower) {
      filteredPlayers = filteredPlayers.map((filtered, i) => {
        if (filtered) {
          // it's already being filtered out
          return true;
        }

        // check for whether the name, split is similar to nameFilter
        const { name } = players[i];
        const lowercaseName = name.toLowerCase();
        const names = lowercaseName.split(' ');
        const firstNameMatch = names[0].startsWith(nameFilterLower);
        const lastNameMatch = names[1] ? names[1].startsWith(nameFilterLower) : false;

        // filter out all players but those that match the search term
        return !(lowercaseName.startsWith(nameFilterLower) || firstNameMatch || lastNameMatch);
      });
    }

    const adpDiff = [0, 0.5, 1].map((ppr) => Math.abs(ppr - scoring.receptions));
    const minDiff = Math.min(...adpDiff);
    const minDiffIndex = adpDiff.indexOf(minDiff);
    const adpCol = { 0: 'std', 1: 'halfPpr', 2: 'ppr' }[minDiffIndex]!;

    // players that will be drafted soon
    const draftSoon = players.map((p, i) => !filteredPlayers[i] && p[adpCol] > 0 && currentPick + 8 >= p[adpCol]);

    // players that are RB handcuffs
    const rbHandcuffs = new Set(
      players.filter((p, i) => !filteredPlayers[i] && p.pos === 'RB' && rbHandcuffTeams[p.team])
    );

    // players that will be recommended
    let recommendedCount = 0;
    const recommended = players.reduce((acc, p, i) => {
      // for first few, it's likely a yes
      if (recommendedCount < 3 && valuedPositions[p.pos]) {
        if (draftSoon[i] || p[adpCol] === 0) {
          // accounting for players w/ a lack of adps
          recommendedCount += 1;
          return [...acc, p];
        }
      } else if (i < 30 && rbHandcuffs.has(p)) {
        recommendedCount += 1;
        return [...acc, p];
      }
      return acc;
    }, []);

    return (
      <PlayerTable
        {...this.props}
        adpCol={adpCol}
        players={players}
        draftSoon={draftSoon}
        filteredPlayers={filteredPlayers}
        nameFilter={nameFilter}
        mobile={!!mobile}
        recommended={new Set(recommended)}
        positionsToShow={positionsToShow}
        rbHandcuffs={rbHandcuffs}
        setNameFilter={this.setNameFilter}
        togglePositionFilter={this.togglePositionFilter}
        resetPositionFilter={this.resetPositionFilter}
      />
    );
  }

  /**
   * update the allowable positions in state, used to filter out players by position
   */
  private togglePositionFilter = (position: Position) => {
    let { positionsToShow } = this.state;

    // if it's ?, clear anything else
    if (position === '?') {
      this.setState({ positionsToShow: ['?'] });
    } else if (positionsToShow.indexOf(position) > -1) {
      positionsToShow = positionsToShow.filter((p) => p !== position);
      this.setState({
        positionsToShow: positionsToShow.length ? positionsToShow : ['?'],
      });
    } else {
      positionsToShow = positionsToShow.filter((p) => p !== '?');
      this.setState({
        positionsToShow: positionsToShow.concat([position]),
      });
    }
  };

  /**
   * reset the position filter so all positions are shown. Called after a player is selected.
   */
  private resetPositionFilter = () => {
    this.setState({ positionsToShow: ['?'] });
  };

  /**
   * update the filter for searching for a plauer by name or team
   */
  private setNameFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ nameFilter: e.target.value });
  };
}

const mapStateToProps = (state: IStoreState) => {
  const { QB, RB, WR, TE, FLEX, SUPERFLEX, DST, K, BENCH } = state.teams[state.trackedTeam];

  // add the positions to the object that the trackedTeam hasn't
  // filled their roster with (ie they have space for)
  const notFilled = (pos: NullablePlayer[]) => !pos.every((p: IPlayer) => !!p);
  const valuedPositions = {} as any;
  if (notFilled(QB)) {
    valuedPositions.QB = true;
  }
  if (notFilled(RB)) {
    valuedPositions.RB = true;
  }
  if (notFilled(WR)) {
    valuedPositions.WR = true;
  }
  if (notFilled(FLEX)) {
    valuedPositions.RB = true;
    valuedPositions.WR = true;
    valuedPositions.TE = true;
  }
  if (notFilled(SUPERFLEX)) {
    valuedPositions.QB = true;
    valuedPositions.RB = true;
    valuedPositions.WR = true;
    valuedPositions.TE = true;
  }
  if (notFilled(TE)) {
    valuedPositions.TE = true;
  }

  // after one of each main starter has been drafted, everything is valued
  if (!Object.keys(valuedPositions).length) {
    // always want more RBs and WRs
    valuedPositions.RB = true;
    valuedPositions.WR = true;

    // only want one backup QB and TE
    const qbBackupCount = BENCH.filter((p) => p && p.pos === 'QB').length;
    if (qbBackupCount < 1) {
      valuedPositions.QB = true;
    }
    const teBackupCount = BENCH.filter((p) => p && p.pos === 'TE').length;
    if (teBackupCount < 1) {
      valuedPositions.TE = true;
    }
  }

  // only want one of each K and DST, none on bench
  if (notFilled(K)) {
    valuedPositions.K = true;
  }
  if (notFilled(DST)) {
    valuedPositions.DST = true;
  }

  // find the bye weeks already taken by the core players (QB, RB, WR, FLEX)
  const byeWeeks = [...QB, ...RB, ...WR, ...FLEX, ...SUPERFLEX]
    .map((p) => p && p.bye)
    .reduce((acc, bye) => (bye ? { ...acc, [bye]: true } : acc), {});

  // find the teams of the rbs, other rbs on these teams will be handcuffs
  const rbHandcuffTeams = [...RB, ...FLEX]
    .filter((p: IPlayer) => p && p.pos === 'RB')
    .reduce((acc, p: IPlayer) => ({ ...acc, [p.team]: true }), {});

  return {
    byeWeeks,
    currentPick: state.currentPick,
    rbHandcuffTeams,
    scoring: state.scoring,
    undraftedPlayers: state.undraftedPlayers,
    valuedPositions,
  };
};

const mapDispatchToProps = (dispatch: any) => ({
  onPickPlayer: (player: IPlayer) => dispatch(onPickPlayer(player)),
  onRemovePlayer: (player: IPlayer) => dispatch(onRemovePlayer(player)),
  skip: () => dispatch(skipPick()),
  undo: () => dispatch(undoLast()),
});

export default connect(mapStateToProps, mapDispatchToProps)(PlayerTableContainer);
