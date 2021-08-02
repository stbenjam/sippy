import ArrowDownwardRoundedIcon from '@material-ui/icons/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded';
import SyncAltRoundedIcon from '@material-ui/icons/SyncAltRounded';

export default function PassRateIcon(props) {
    if (Math.abs(props.improvement) <= 2) {
        return <SyncAltRoundedIcon style={{ color: "grey" }} />;
    } else if (props.improvement >= 2) {
        return <ArrowUpwardRoundedIcon style={{ stroke: "green", strokeWidth: 3, color: "green" }}/>;
    } else {
        return <ArrowDownwardRoundedIcon style={{ stroke: "darkred", strokeWidth: 3, color: "darkred" }} />;
    }
}