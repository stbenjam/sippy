import { Button, Menu, MenuItem } from '@material-ui/core';
import React, { Fragment } from 'react';
import ImportExportIcon from '@material-ui/icons/ImportExport';

const MOST_IMPROVED_SORT = [{
    field: 'net_improvement',
    sort: 'desc'
}];

const LEAST_IMPROVED_SORT = [{
    field: 'net_improvement',
    sort: 'asc'
}];

const CURRENT_PASS_PERCENT = [{
    field: 'current_pass_percentage',
    sort: 'asc'
}];

const PREVIOUS_PASS_PERCENT = [{
    field: 'previous_pass_percentage',
    sort: 'asc'
}];

export default function SortByMenu(props) {
    const [anchorEl, setAnchorEl] = React.useState(null);
    
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const setSort = (sort) => {
        props.setSort(sort)
        handleClose()
    }

    return (
        <Fragment>
            <Button aria-controls="sort-menu" aria-haspopup="true" onClick={handleClick} startIcon={<ImportExportIcon />} color="primary">Sort</Button>
            <Menu
                id="reports-menu"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
            >

                <MenuItem onClick={() => setSort(MOST_IMPROVED_SORT)}>Most improved</MenuItem>
                <MenuItem onClick={() => setSort(LEAST_IMPROVED_SORT)}>Least improved</MenuItem>
                <MenuItem onClick={() => setSort(CURRENT_PASS_PERCENT)}>Current pass %</MenuItem>
                <MenuItem onClick={() => setSort(PREVIOUS_PASS_PERCENT)}>Previous pass %</MenuItem>
            </Menu>
        </Fragment>
    );
}
