import PropTypes from 'prop-types'
import React, { Fragment } from 'react'

export default function LastUpdated (props) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const millisAgo = props.lastUpdated ? (props.lastUpdated.getTime() - Date.now()) : 0

  const minute = 1000 * 60 // Milliseconds in a minute
  const hour = 60 * minute // Milliseconds in an hour

  try {
    if (millisAgo === 0) {
      return <Fragment>unknown</Fragment>
    } else if (Math.abs(millisAgo) < hour) {
      return (
                <Fragment>
                    Last updated {rtf.format(Math.round(millisAgo / minute), 'minutes')}
                </Fragment>
      )
    } else {
      return (
                <Fragment>
                    Last updated {rtf.format(Math.round(millisAgo / hour), 'hours')}
                </Fragment>
      )
    }
  } catch (e) {
    return <></>
  }
}

LastUpdated.propTypes = {
  lastUpdated: PropTypes.instanceOf(Date).isRequired
}
