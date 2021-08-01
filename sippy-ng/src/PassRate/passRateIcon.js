import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@material-ui/icons/ArrowDownwardRounded';
import SyncAltRoundedIcon from '@material-ui/icons/SyncAltRounded';
import { makeStyles } from '@material-ui/core';
import { green } from '@material-ui/core/colors';

export default function PassRateIcon(props) {
    let classes = makeStyles(({
        good: {
           color: green[500], 
        },
    }));

    if (Math.abs(props.current - props.previous) <= 2) {
        return <SyncAltRoundedIcon style={{ color: "grey" }} />;
    } else if (props.current > props.previous) {
        return <ArrowUpwardRoundedIcon style={{ color: "green" }}/>;
    } else {
        return <ArrowDownwardRoundedIcon style={{ color: "red" }} />;
    }
}