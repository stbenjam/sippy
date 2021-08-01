import { makeStyles } from '@material-ui/core/styles';
import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid';
import { Container, Typography } from '@material-ui/core';
import PassRateCard from '../PassRate/passRateCard';
import PassRateByVariant from '../PassRate/passRateByVariant';

export default class ReleaseOverview extends Component {
    state = {
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

    constructor(props) {
        super(props);
    }

    fetchData = () => {
        fetch('/json?release=4.9')
            .then((response) => response.json())
            .then(json => {
                this.setState({
                    isLoaded: true,
                    indicators: json[this.props.release]["topLevelReleaseIndicators"],
                    passRateByVariant: json[this.props.release]["jobPassRateByVariant"],
                })
            })
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
        this.fetchData();
    }

    render() {
        if (this.state.isLoaded == false) {
            return "<div></div>"
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
                            <PassRateByVariant rows={this.state.passRateByVariant} />
                        </Grid>
                    </Grid>
                </Container>
            </div>
        );
    }
}
