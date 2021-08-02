import { Container, Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createTheme, makeStyles, useTheme } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import React, { Component, useEffect } from 'react';
import PassRateByVariant from '../PassRate/passRateByVariant';
import PassRateCard from '../PassRate/passRateCard';

const defaultTheme = createTheme();
const useStyles = makeStyles(
    (theme) => ({
        root: {
            flexGrow: 1,
        },
        card: {
            minWidth: 275,
            alignContent: "center",
            margin: "auto",
        },
        title: {
            textAlign: "center",
        },
    }),
    { defaultTheme },
);

export default function ReleaseOverview(props) {
    const classes = useStyles();
    const theme = useTheme();

    const [fetchError, setFetchError] = React.useState("")
    const [isLoaded, setLoaded] = React.useState(false)
    const [indicators, setIndicators] = React.useState({})
    const [passRateByVariant, setPassRateByVariant] = React.useState([])

    let fetchData = () => {
        fetch(process.env.REACT_APP_API_URL + '/json?release=' + props.release)
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error("server returned " + response.status);
                }
                return response.json();
            })
            .then(json => {
                setIndicators(json[props.release].topLevelReleaseIndicators)
                setPassRateByVariant(json[props.release].jobPassRateByVariant)
                setLoaded(true)
            }).catch(error => {
                setFetchError("Could not retrieve release " + props.release + ", " + error);
            });
    }

    let cardBackground = (percent) => {
        if (percent > 90) {
            return theme.palette.success.light; 
        } else if (percent > 60) {
            return theme.palette.warning.light;
        } else {
            return theme.palette.error.light; 
        }
    }

    useEffect(() => {
        if (!isLoaded) {
            fetchData();
        }
    }, []);

    if (fetchError !== "") {
        return <Alert severity="error">{fetchError}</Alert>;
    }

    if (!isLoaded) {
        return "Loading..."
    }

    return (
        <div className="{classes.root}" style={{ padding: 20 }}>
            <Container maxWidth="lg">
                <Typography variant="h4" gutterBottom className={classes.title}>CI Release {props.release} Health Summary</Typography>
                <Grid container spacing={3} xs={12}>
                    <Grid item xs={12}>
                        <Typography variant="h5">Top Level Release Indicators</Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <PassRateCard backgroundColor={cardBackground(indicators.infrastructure.current_pass_rate.percentage)} name="Infrastructure" passRate={indicators.infrastructure} />
                    </Grid>
                    <Grid item xs={4}>
                        <PassRateCard backgroundColor={cardBackground(indicators.install.current_pass_rate.percentage)} name="Install" passRate={indicators.install} />
                    </Grid>
                    <Grid item xs={4}>
                        <PassRateCard backgroundColor={cardBackground(indicators.upgrade.current_pass_rate.percentage)} name="Upgrade" passRate={indicators.upgrade} />
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="h5">Job Pass Rate By Variant</Typography>
                    </Grid>
                    <Grid item xs={12}>
                        <PassRateByVariant rows={passRateByVariant} release={props.release} />
                    </Grid>
                </Grid>
            </Container>
        </div>
    );
}
