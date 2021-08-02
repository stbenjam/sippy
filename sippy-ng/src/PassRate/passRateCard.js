import { Box, Card, CardContent, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PassRateIcon from '../PassRate/passRateIcon';
import { PieChart } from 'react-minimal-pie-chart';

const useStyles = makeStyles({
    cardContent: props => ({
        backgroundColor: props.backgroundColor,
        color: "black",
        textAlign: "center",
    })
});

export default function PassRateCard(props) {
    const classes = useStyles(props);

    const [currentData, setCurrentData] = React.useState([])

    let header = props.name
    if (props.link !== undefined) {
        header = <Link to={props.link}>{props.name}</Link>
    }

    useEffect(() => {
        setCurrentData(
            [
                {
                    title: "Pass",
                    value: props.passRate.current_pass_rate.percentage,
                    color: "#4A934A",
                },
                {
                    title: "Fail",
                    value: 100 - props.passRate.current_pass_rate.percentage,
                    color: "#DC3545",
                }
            ]
        )
    }, [currentData])


    return (
        <Card elevation={5}>
            <CardContent className={`${classes.cardContent}`}>
                <Typography variant="h6">{header}</Typography>
                <PieChart
                    animate
                    animationDuration={500}
                    animationEasing="ease-out"
                    center={[40, 25]}
                    data={currentData}
                    labelPosition={50}
                    lengthAngle={360}
                    lineWidth={30}
                    paddingAngle={2}
                    radius={20}
                    segmentsShift={0.5}
                    startAngle={0}
                    viewBoxSize={[80, 50]}
                />
                <Box component="h3">
                    {props.passRate.current_pass_rate.percentage.toFixed(0)}% ({props.passRate.current_pass_rate.runs} runs)&nbsp;
                    <PassRateIcon improvement={props.passRate.current_pass_rate.percentage - props.passRate.previous_pass_rate.percentage} />&nbsp;
                    {props.passRate.previous_pass_rate.percentage.toFixed(0)}% ({props.passRate.previous_pass_rate.runs} runs)
                </Box>
            </CardContent>
        </Card>
    );
}