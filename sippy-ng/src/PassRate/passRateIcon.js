import { makeStyles } from '@material-ui/core';
import { green } from '@material-ui/core/colors';
import ArrowDownwardRoundedIcon from '@material-ui/icons/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded';
import SyncAltRoundedIcon from '@material-ui/icons/SyncAltRounded';

export default function PassRateIcon(props) {
    if (Math.abs(props.improvement) <= 2) {
        return <SyncAltRoundedIcon style={{ color: "grey" }} />;
    } else if (props.improvement >= 2) {
        return <ArrowUpwardRoundedIcon style={{ color: "green" }}/>;
    } else {
        return <ArrowDownwardRoundedIcon style={{ color: "red" }} />;
    }
}