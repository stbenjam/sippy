import { Container, Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import React, { Component } from 'react';
import PassRateByVariant from '../PassRate/passRateByVariant';
import PassRateCard from '../PassRate/passRateCard';

export default class ReleaseOverview extends Component {
    state = {
        fetchError: "",
        isLoaded: false,
        indicators: {},
    }

    classes = makeStyles((theme) => ({
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
    }));

    fetchData = (props) => {
        fetch(process.env.REACT_APP_API_URL + '/json?release=' + this.props.release)
            .then((response) => {
                if(response.status !== 200) {
                    throw new Error("server returned " + response.status);
                }
                return response.json();
            })
            .then(json => {
                this.setState({
                    isLoaded: true,
                    indicators: json[this.props.release]["topLevelReleaseIndicators"],
                    passRateByVariant: json[this.props.release]["jobPassRateByVariant"],
                })
            }).catch(error => {
                this.setState({fetchError: "Could not retrieve release " + this.props.release + ", " + error});
            });
    }

    cardBackground = (percent) => {
        if (percent > 90) {
            return "#c3e6cb";
        } else if (percent > 60) {
            return "#ffeeba";
        } else {
            return "#f5c6cb";
        }
    }

    componentDidMount() {
        this.fetchData(this.props);
    }

    render() {
        if (this.state.fetchError !== "") {
            return <Alert severity="error">{this.state.fetchError}</Alert>;
        }

        if (this.state.isLoaded === false) {
            return "Loading..."
        }

        return (
            <div className="{this.classes.root}" style={{ padding: 20 }}>
                <Container maxWidth="lg">
                    <Typography variant="h4" gutterBottom className={this.classes.title}>CI Release {this.props.release} Health Summary</Typography>
                    <Grid container spacing={3} xs={12}>
                        <Grid item xs={12}>
                            <Typography variant="h5">Top Level Release Indicators</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <PassRateCard backgroundColor={this.cardBackground(this.state.indicators.infrastructure.current_pass_rate.percentage)} name="Infrastructure" passRate={this.state.indicators.infrastructure} />
                        </Grid>
                        <Grid item xs={4}>
                            <PassRateCard backgroundColor={this.cardBackground(this.state.indicators.install.current_pass_rate.percentage)} name="Install" passRate={this.state.indicators.install} />
                        </Grid>
                        <Grid item xs={4}>
                            <PassRateCard backgroundColor={this.cardBackground(this.state.indicators.upgrade.current_pass_rate.percentage)} name="Upgrade" passRate={this.state.indicators.upgrade} />
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h5">Job Pass Rate By Variant</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <PassRateByVariant rows={this.state.passRateByVariant} release={this.props.release} />
                        </Grid>
                    </Grid>
                </Container>
            </div>
        );
    }
}
