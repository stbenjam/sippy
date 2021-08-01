import { Box, Button } from '@material-ui/core';
import { Container, Typography } from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import { DataGrid } from '@material-ui/data-grid';
import { BugReport, Search } from '@material-ui/icons';
import Alert from '@material-ui/lab/Alert';
import React, { Component } from 'react';
import PassRateIcon from '../PassRate/passRateIcon';

const columns = [
    /* field: 'id', headerName: 'ID', flex: 0.25 },*/
    { field: 'name', headerName: 'Name', flex: 5 },
    {
        field: 'current_pass_percentage',
        headerName: 'Last 7 Days',
        type: 'number',
        flex: 1,
        valueFormatter: (params) => {
            const valueFormatted = Number(params.value).toFixed(2).toLocaleString();
            return `${valueFormatted} %`;
        },
    },
    {
        field: 'net_improvement',
        headerName: ' ',
        flex: 0.2,
        renderCell: (params) => {
            return <PassRateIcon improvement={params.value} />
        },
    },
    {
        field: 'previous_pass_percentage',
        headerName: 'Previous 7 days',
        flex: 1,
        type: 'number',
        valueFormatter: (params) => {
            const valueFormatted = Number(params.value).toFixed(2).toLocaleString();
            return `${valueFormatted} %`;
        },
    },
    {
        field: 'link',
        headerName: ' ',
        flex: 1,
        renderCell: (params) => {
            return (
                <Box>
                    <Button startIcon={<Search />} href={params.value} />
                    <Button startIcon={<BugReport />} href={params.value} />
                </Box>
            );
        },
    },
];

const testActions = [
    {
        icon: <span className="glyphicon glyphicon-remove" />,
        callback: () => {
            alert("Deleting");
        }
    },
    {
        icon: "glyphicon glyphicon-link",
        actions: [
            {
                text: "Option 1",
                callback: () => {
                    alert("Option 1 clicked");
                }
            },
            {
                text: "Option 2",
                callback: () => {
                    alert("Option 2 clicked");
                }
            }
        ]
    }
];

function getCellActions(column, row) {
    const cellActions = {
        name: testActions
    };
    return cellActions[column.key];
}


export default class TestTable extends Component {
    state = {
        fetchError: "",
        isLoaded: false,
        tests: [],
    }


    constructor(props) {
        super(props);
    }

    fetchData = (props) => {
        fetch(process.env.REACT_APP_API_URL + '/api/tests?release=' + this.props.release)
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error("server returned " + response.status);
                }
                return response.json();
            })
            .then(json => {
                this.setState({
                    isLoaded: true,
                    tests: json,
                })
            }).catch(error => {
                this.setState({ fetchError: "Could not retrieve tests " + this.props.release + ", " + error });
            });
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
            <Container size="xl">
                <Typography variant="h4">
                    Test Results for {this.props.release}
                </Typography>
                <DataGrid
                    rows={this.state.tests}
                    columns={columns}
                    autoHeight={true}
                    pageSize={25}
                    getCellActions={getCellActions}
                />
            </Container>
        );
    }
}
