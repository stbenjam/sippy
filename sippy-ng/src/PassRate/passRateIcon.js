import { Tooltip } from '@material-ui/core';
import ArrowDownwardRoundedIcon from '@material-ui/icons/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded';
import SyncAltRoundedIcon from '@material-ui/icons/SyncAltRounded';

export default function PassRateIcon(props) {
    let icon = ""

    if (Math.abs(props.improvement) <= 2) {
        icon = <SyncAltRoundedIcon style={{ color: "grey" }} />;
    } else if (props.improvement >= 2) {
        icon = <ArrowUpwardRoundedIcon style={{ stroke: "green", strokeWidth: 3, color: "green" }} />;
    } else {
        icon = <ArrowDownwardRoundedIcon style={{ stroke: "darkred", strokeWidth: 3, color: "darkred" }} />;
    }

    if (props.tooltip) {
        return <Tooltip title={props.improvement.toFixed(2) + "%"}>{icon}</Tooltip>;
    } else {
        return icon;
    }
}

PassRateIcon.defaultProps= {
    tooltip: false,
}