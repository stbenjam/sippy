import FullCalendar from '@fullcalendar/react'

import { filterFor } from '../helpers'
import { useTheme } from '@mui/material/styles'
import dayGridPlugin from '@fullcalendar/daygrid'
import PayloadCalendarLegend from './PayloadCalendarLegend'
import PropTypes from 'prop-types'
import React, { Fragment } from 'react'

export default function PayloadCalendar(props) {
  const theme = useTheme()
  const navigate = useNavigate()

  const eventSources = [
    {
      url:
        process.env.REACT_APP_API_URL +
        '/api/releases/tags/events?release=' +
        props.release,
      method: 'GET',
      extraParams: {
        filter: JSON.stringify({
          items: [
            filterFor('phase', 'equals', 'Accepted'),
            filterFor('architecture', 'equals', props.arch),
            filterFor('stream', 'equals', props.stream),
          ],
        }),
      },
      color: theme.palette.success.light,
      textColor: theme.palette.success.contrastText,
    },
    {
      url:
        process.env.REACT_APP_API_URL +
        '/api/releases/tags/events?release=' +
        props.release,
      method: 'GET',
      extraParams: {
        filter: JSON.stringify({
          items: [
            filterFor('phase', 'equals', 'Rejected'),
            filterFor('architecture', 'equals', props.arch),
            filterFor('stream', 'equals', props.stream),
          ],
        }),
      },
      color: theme.palette.error.light,
      textColor: theme.palette.error.contrastText,
    },
    {
      url: process.env.REACT_APP_API_URL + '/api/incidents',
      method: 'GET',
      color: theme.palette.common.black,
      textColor: theme.palette.error.contrastText,
    },
  ]

  const eventClick = (info) => {
    if (info.event?.extendedProps?.phase === 'incident') {
      window.open(
        'https://issues.redhat.com/browse/' + info.event.extendedProps.jira,
        '_blank'
      )
    } else {
      navigate(`/release/${props.release}/tags/${info.event.title}`)
    }
  }

  return (
    <Fragment>
      <PayloadCalendarLegend />
      <FullCalendar
        timeZone="UTC"
        headerToolbar={{
          start: 'title',
          center: '',
          end: 'today prev,next',
        }}
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        eventClick={eventClick}
        eventSources={eventSources}
      />
    </Fragment>
  )
}

PayloadCalendar.propTypes = {
  release: PropTypes.string,
  arch: PropTypes.string,
  stream: PropTypes.string,
  view: PropTypes.string,
}
