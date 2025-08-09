import { DeleteOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import * as React from 'react';
import { Player } from '../lib/models/Player';

// Import helper functions from a shared utilities module.  Centralising
// colour logic improves maintainability and ensures a single source of truth
// for how advanced metrics are visualised.
import {
  getVorpColor,
  getTierColor,
  getVolatilityColor,
} from '../lib/utils/playerColors';


// The props interface is updated to use the new Player model
interface IPlayerRowProps {
  byeWeekConflict: boolean;
  draftSoon: boolean;
  inValuablePosition: boolean;
  mobile: boolean;
  onPickPlayer: (player: Player) => void;
  player: Player; // Use the new Player type
  rbHandcuff: boolean;
  recommended: boolean;
  onRemovePlayer: (player: Player) => void;
}

/**
 * A single player row in the PlayerTable.
 * Shows name, team and the advanced metrics (VORP, Tier, Risk).  This
 * functional component is wrapped in React.memo to avoid unnecessary re‑renders
 * when props have not changed.
 */
function PlayerTableRow({
  byeWeekConflict,
  draftSoon,
  inValuablePosition,
  mobile,
  onPickPlayer,
  player,
  rbHandcuff,
  recommended,
  onRemovePlayer,
}: IPlayerRowProps) {
  return (
    <div
      onClick={() => onPickPlayer(player)}
      className={inValuablePosition || mobile ? 'row' : 'row row-inactive'}
    >
      <div className="col col-name">
        <p>{player.tableName || player.Player}</p>
        {/* Informational dots are preserved */}
        {recommended && !mobile && <div className="dot green-dot" title="Recommended" />}
        {rbHandcuff && !mobile && <div className="dot blue-dot" title="Handcuff" />}
        {draftSoon ? <div className="dot orange-dot" title="Draft Soon" /> : null}
        {byeWeekConflict && !mobile && <div className="dot red-dot" title="BYE Conflict" />}
      </div>
      <p className="col col-pos">{player.Pos}</p>
      <p className="col col-team">{player.Team}</p>

      {/* --- METRIC COLUMNS --- */}
      <p
        className="col col-vor"
        style={{ fontWeight: 'bold', color: getVorpColor(player.VORP) }}
      >
        {player.VORP.toFixed(1)}
      </p>
      <p className="col" style={{ color: 'white', textAlign: 'center' }}>
        <span
          style={{
            backgroundColor: getTierColor(player.Tier),
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          {player.Tier || 'N/A'}
        </span>
      </p>
      <p
        className="col"
        style={{ color: getVolatilityColor(player.Volatility), fontWeight: 'bold' }}
      >
        {player.Volatility.toFixed(1)}
      </p>
      {/* --- END METRIC COLUMNS --- */}

      {!mobile && (
        <>
          <p className="col col-adp">{player.ADP ? player.ADP.toFixed(1) : ''}</p>
          <div className="col col-remove">
            <Button
              icon={<DeleteOutlined />}
              size="small"
              type="text"
              className="remove-player-button"
              style={{ marginRight: 10 }}
              onClick={(e) => {
                e.stopPropagation(); // Prevent the row's onClick from firing
                onRemovePlayer(player);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(PlayerTableRow);
