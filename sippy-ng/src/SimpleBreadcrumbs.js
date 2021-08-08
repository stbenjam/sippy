import React from 'react';
import Typography from '@material-ui/core/Typography';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import { Link } from 'react-router-dom';

export default function SimpleBreadcrumbs(props) {

  return (
    <Breadcrumbs aria-label="breadcrumb">
      <Link to={"/release/" + props.release}>
          Overview 
      </Link>
      {props.currentPage ? <Typography>{props.currentPage}</Typography> : ""}
    </Breadcrumbs>
  );
}