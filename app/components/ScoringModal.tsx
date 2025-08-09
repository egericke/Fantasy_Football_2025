import { InputNumber, Modal } from 'antd';
import * as React from 'react';
import { connect } from 'react-redux';
import { IScoring } from '../lib/models/Scoring';
import { setScoreFormat } from '../lib/store/actions/scoring';
import { toggleScoringFormatting } from '../lib/store/actions/scoring';
import { IStoreState } from '../lib/store/store';

interface IProps {
  formattingScoring: boolean;
  scoring: IScoring;
  dispatchSetScoreFormat: (scoring: IScoring) => void;
  toggleScoringFormatting: () => void;
}

/**
 * Modal for change the points per TD/reception/fumble/etc
 */
class ScoringModal extends React.Component<IProps> {
  /** Offensive settings */
  private offense = {
    passYds: '25 passing yds',
    passTds: 'Thrown TD',
    passInts: 'Interception',
    receptions: 'Reception',
    receptionYds: '10 receiving yds',
    receptionTds: 'TD reception',
    rushYds: '10 rushing yds',
    rushTds: 'Rushing TD',
    fumbles: 'Fumble',
    twoPts: '2PT conversion',
  };

  /** Kicker settings */
  private kickers = {
    kickExtraPoints: 'Extra point kick',
    kick019: 'Kick 0-19 yds',
    kick2029: 'Kick 20-29 yds',
    kick3039: 'Kick 30-39 yds',
    kick4049: 'Kick 40-49 yds',
    kick50: 'Kick 50+ yds',
  };

  /** DST settings */
  private dst = {
    dfInts: 'Defensive ints',
    dfTds: 'Defensive TD',
    dfSacks: 'Defensive sack',
    dfFumbles: 'Fumble recovery',
    dfSafeties: 'Safety',
  };

  /**
   * Some stats are reported as multiples, but should be 1:1 during forecasting
   */
  private multiple = {
    passYds: 25,
    receptionYds: 10,
    rushYds: 10,
  };

  public render() {
    const { formattingScoring, scoring } = this.props;

    return (
      // @ts-ignore
      <Modal
        title="Change scoring"
        visible={formattingScoring}
        onOk={this.props.toggleScoringFormatting}
        onCancel={this.props.toggleScoringFormatting}>
        <div className="scoring-columns">
          <div className="scoring-column left-column">
            <h5>Offense</h5>
            {Object.keys(this.offense).map((k) => (
              <div className="scoring-input" key={k}>
                {/* @ts-ignore */}
                <label htmlFor={k}>{this.offense[k]}</label>
                <InputNumber
                  // @ts-ignore
                  defaultValue={this.multiple[k] ? scoring[k] * this.multiple[k] : scoring[k]}
                  id={k}
                  onBlur={this.changeScoring}
                  key={k}
                  name={k}
                  type="number"
                />
              </div>
            ))}
          </div>

          <div className="scoring-column">
            <h5>Kicking</h5>
            {Object.keys(this.kickers).map((k) => (
              <div className="scoring-input" key={k}>
                {/* @ts-ignore */}
                <label htmlFor={k}>{this.kickers[k]}</label>
                <InputNumber
                  // @ts-ignore
                  defaultValue={scoring[k]}
                  id={k}
                  key={k}
                  name={k}
                  onBlur={this.changeScoring}
                  type="number"
                />
              </div>
            ))}
          </div>

          <div className="scoring-column">
            <h5>Defense</h5>
            {Object.keys(this.dst).map((k) => (
              <div className="scoring-input" key={k}>
                {/* @ts-ignore */}
                <label htmlFor={k}>{this.dst[k]}</label>
                <InputNumber
                  // @ts-ignore
                  defaultValue={scoring[k]}
                  id={k}
                  key={k}
                  name={k}
                  onBlur={this.changeScoring}
                  type="number"
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    );
  }

  /**
   * Update state and re-rank the players with the new scoring
   */
  private changeScoring = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { scoring, dispatchSetScoreFormat } = this.props;
    const { id, value } = e.target;

    let numValue: number;
    // @ts-ignore
    if (this.multiple[id]) {
      // @ts-ignore
      numValue = parseFloat(value) / this.multiple[id];
    } else {
      numValue = parseFloat(value);
    }

    dispatchSetScoreFormat({ ...scoring, [id]: numValue });
  };
}

const mapStateToProps = ({ formattingScoring, scoring }: IStoreState) => ({
  formattingScoring,
  scoring,
});

const mapDispathToProps = (dispatch: any) => ({
  dispatchSetScoreFormat: (scoring: IScoring) => dispatch(setScoreFormat(scoring)),
  toggleScoringFormatting: () => dispatch(toggleScoringFormatting()),
});

export default connect(mapStateToProps, mapDispathToProps)(ScoringModal);
