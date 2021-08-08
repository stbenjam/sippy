import { Card, CardContent, Tooltip, Typography } from '@material-ui/core'
import PropTypes from 'prop-types'
import { makeStyles } from '@material-ui/core/styles'
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PieChart } from 'react-minimal-pie-chart'

const useStyles = makeStyles({
  cardContent: {
    color: 'black',
    textAlign: 'center'
  },
  summaryCard: props => ({
    backgroundColor: props.backgroundColor,
    height: '100%'
  })
})

export default function SummaryCard (props) {
  const classes = useStyles(props)

  const [currentData, setCurrentData] = React.useState([])

  useEffect(() => {
    const data = []

    if (props.flakes !== 0) {
      data.push({
        title: 'Flakes',
        value: props.flakes,
        color: '#FF8800'
      })
    }

    data.push({
      title: 'Success',
      value: props.success,
      color: '#4A934A'
    })

    data.push({
      title: 'Fail',
      value: props.fail,
      color: 'darkred'
    })

    setCurrentData(data)
  }, [props])

  let header = props.name
  if (props.link !== undefined) {
    header = <Link to={props.link}>{props.name}</Link>
  }

  if (props.tooltip !== '') {
    header = (
            <Tooltip title={props.tooltip}>
                {header}
            </Tooltip>
    )
  }

  return (
    <Card elevation={5} className={`${classes.summaryCard}`}>
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
            {props.caption}
        </CardContent>
    </Card>
  )
}

SummaryCard.defaultProps = {
  flakes: 0,
  success: 0,
  fail: 0,
  caption: '',
  tooltip: ''
}

SummaryCard.propTypes = {
  flakes: PropTypes.number,
  success: PropTypes.number,
  fail: PropTypes.number,
  caption: PropTypes.string,
  tooltip: PropTypes.string,
  name: PropTypes.string,
  link: PropTypes.link
}
