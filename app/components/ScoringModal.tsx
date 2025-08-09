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
      <Modal
        title="Change scoring"
        // In Ant Design v5 the `visible` prop has been replaced by `open` to control
        // modal visibility.  Updating to the new API avoids deprecation warnings.
        open={formattingScoring}
        onOk={this.props.toggleScoringFormatting}
        onCancel={this.props.toggleScoringFormatting}
      >
        <div className="scoring-columns">
          <div className="scoring-column left-column">
            <h5>Offense</h5>
            {Object.keys(this.offense).map((k) => (
              <div className="scoring-input" key={k}>
                {/* @ts-ignore */}
                <label htmlFor={k}>{this.offense[k]}</label>
                <InputNumber
                  defaultValue={
                    this.multiple[k as keyof typeof this.multiple]
                      ? scoring[k as keyof IScoring] * (this.multiple[k as keyof typeof this.multiple] as number)
                      : scoring[k as keyof IScoring]
                  }
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
                  defaultValue={scoring[k as keyof IScoring]}
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
                  defaultValue={scoring[k as keyof IScoring]}
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
  private changeScoring = (e: React.FocusEvent<HTMLInputElement>) => {
    const { scoring, dispatchSetScoreFormat } = this.props;
    const { id, value } = e.target;
    // Cast the id string to a valid scoring key so TypeScript can infer
    // the correct property type on the scoring object.
    const key = id as keyof IScoring;
    let numValue = parseFloat(value) || 0;
    // If this stat is reported on a 10‑ or 25‑yard basis we normalise it
    // by dividing by the multiplier to convert back to per‑unit scoring.
    if (Object.prototype.hasOwnProperty.call(this.multiple, key)) {
      const divisor = this.multiple[key as keyof typeof this.multiple] as number;
      numValue = parseFloat(value) / divisor;
    }
    dispatchSetScoreFormat({ ...scoring, [key]: numValue });
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
