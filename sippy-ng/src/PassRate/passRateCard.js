import { makeStyles } from '@material-ui/core/styles';
import { Card, CardContent, Box, Typography } from '@material-ui/core';
import React, { Fragment } from 'react';
import ArrowUpwardRoundedIcon from '@material-ui/icons/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@material-ui/icons/ArrowDownwardRounded';
import SyncAltRoundedIcon from '@material-ui/icons/SyncAltRounded';
import { green } from '@material-ui/core/colors';
import PassRateIcon from '../PassRate/passRateIcon';

const useStyles = makeStyles({
    cardContent: props => ({
        backgroundColor: props.backgroundColor,
        color: "black",
    })
});

export default function PassRateCard(props) {
    const classes = useStyles(props);

    return (
        <Card>
            <CardContent className={`${classes.cardContent}`}>
                <Typography gutterBottom>{props.name}</Typography>
                <Box component="h3">
                    {props.passRate.current_pass_rate.percentage.toFixed(0)}% ({props.passRate.current_pass_rate.runs} runs)&nbsp;
                    <PassRateIcon current={props.passRate.current_pass_rate.percentage} previous={props.passRate.previous_pass_rate.percentage} />&nbsp;
                    {props.passRate.previous_pass_rate.percentage.toFixed(0)}% ({props.passRate.previous_pass_rate.runs} runs)
                </Box>
            </CardContent>
        </Card>
    );
}