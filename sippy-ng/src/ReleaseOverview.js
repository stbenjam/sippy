import { Card, Container, Tooltip, Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { createTheme, makeStyles, useTheme } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import React, { useEffect } from 'react';
import PassRateByVariant, { TOOLTIP as VariantToolTip } from './PassRate/passRateByVariant';
import PassRateCard from './PassRate/passRateCard';
import InfoIcon from '@material-ui/icons/Info';
import { Link } from 'react-router-dom';
import JobTable from './JobTable';
import TestTable from './TestTable';

export const TOOLTIP = "Top level release indicators showing product health"
export const REGRESSED_TOOLTIP = "Shows the most regressed items this week vs. last week, for those with more than 10 runs"

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
                        <Typography variant="h5">
                            Top Level Release Indicators
                            <Tooltip title={TOOLTIP}>
                                <InfoIcon />
                            </Tooltip>
                        </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <PassRateCard backgroundColor={cardBackground(indicators.infrastructure.current_pass_rate.percentage)} name="Infrastructure" link={"/tests/" + props.release + "/details?test=[sig-sippy] infrastructure should work"} passRate={indicators.infrastructure} />
                    </Grid>
                    <Grid item xs={4}>
                        <PassRateCard backgroundColor={cardBackground(indicators.install.current_pass_rate.percentage)} name="Install" link={"/install/" + props.release} passRate={indicators.install} />
                    </Grid>
                    <Grid item xs={4}>
                        <PassRateCard backgroundColor={cardBackground(indicators.upgrade.current_pass_rate.percentage)} name="Upgrade" link={"/upgrade/" + props.release} passRate={indicators.upgrade} />
                    </Grid>
                    <Grid item xs={12}>
                        <Card enhancement="5" style={{ textAlign: 'center'}}>
                            <Typography component={Link} to={"/tests/" + props.release + "?sortBy=regression&filterBy=runs&runs=10"} style={{ margin: 20, textAlign: 'center' }} variant="h5">
                                Most regressed tests
                                <Tooltip title={REGRESSED_TOOLTIP}>
                                    <InfoIcon />
                                </Tooltip>
                            </Typography>

                            <TestTable
                                hideControls={true}
                                sortBy="regression"
                                limit={10}
                                filterBy="runs"
                                runs={10}
                                pageSize={5}
                                release={props.release} />

                        </Card>
                    </Grid>
                    <Grid item xs={6}>

                    </Grid>
                </Grid>
            </Container>
        </div>
    );
}
