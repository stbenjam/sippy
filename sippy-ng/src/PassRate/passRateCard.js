import { Box, Card, CardContent, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import React from 'react';
import { Link } from 'react-router-dom';
import PassRateIcon from '../PassRate/passRateIcon';

const useStyles = makeStyles({
    cardContent: props => ({
        backgroundColor: props.backgroundColor,
        color: "black",
    })
});

export default function PassRateCard(props) {
    const classes = useStyles(props);

    let header = props.name
    if(props.link !== undefined) {
        header = <Link to={props.link}>{props.name}</Link>
    }

    return (
        <Card elevation={5}>
            <CardContent className={`${classes.cardContent}`}>
                <Typography variant="h6">{header}</Typography>
                <Box component="h3">
                    {props.passRate.current_pass_rate.percentage.toFixed(0)}% ({props.passRate.current_pass_rate.runs} runs)&nbsp;
                    <PassRateIcon improvement={props.passRate.current_pass_rate.percentage - props.passRate.previous_pass_rate.percentage} />&nbsp;
                    {props.passRate.previous_pass_rate.percentage.toFixed(0)}% ({props.passRate.previous_pass_rate.runs} runs)
                </Box>
            </CardContent>
        </Card>
    );
}