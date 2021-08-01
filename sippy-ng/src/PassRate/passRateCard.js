import { Box, Card, CardContent, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import React from 'react';
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
                    <PassRateIcon improvement={props.passRate.current_pass_rate.percentage - props.passRate.previous_pass_rate.percentage} />&nbsp;
                    {props.passRate.previous_pass_rate.percentage.toFixed(0)}% ({props.passRate.previous_pass_rate.runs} runs)
                </Box>
            </CardContent>
        </Card>
    );
}