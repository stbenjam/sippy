import { Box, Fade, IconButton, Typography } from '@mui/material'
import {
  Close as CloseIcon,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVeryDissatisfied,
  SentimentVerySatisfied,
} from '@mui/icons-material'
import { makeStyles } from '@mui/styles'
import PropTypes from 'prop-types'
import React, { useState } from 'react'

const useStyles = makeStyles((theme) => ({
  collapsedButton: {
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationStyle: 'dotted',
    transition: 'color 0.2s ease-in-out',
    '&:hover': {
      color: theme.palette.primary.main,
      textDecoration: 'underline',
      textDecorationStyle: 'solid',
    },
  },
  ratingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    padding: 0,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    padding: 4,
    '& .MuiSvgIcon-root': {
      fontSize: '0.9rem',
    },
  },
  ratingQuestion: {
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.25),
  },
  optionsContainer: {
    display: 'flex',
    gap: theme.spacing(0.75),
    alignItems: 'stretch',
  },
  optionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1),
    minWidth: 60,
    cursor: 'pointer',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: theme.shadows[2],
      borderColor: theme.palette.primary.main,
      '& .MuiSvgIcon-root': {
        transform: 'scale(1.1)',
      },
    },
    '&.selected': {
      borderColor: theme.palette.primary.main,
      backgroundColor:
        theme.palette.mode === 'dark'
          ? 'rgba(144, 202, 249, 0.16)'
          : 'rgba(25, 118, 210, 0.08)',
    },
  },
  optionIcon: {
    fontSize: '1.5rem',
    marginBottom: theme.spacing(0.25),
    transition: 'transform 0.2s ease-in-out',
  },
  optionLabel: {
    fontSize: '0.6rem',
    fontWeight: 500,
    textAlign: 'center',
    lineHeight: 1.1,
  },
  thankYouMessage: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
  privacyNotice: {
    fontSize: '0.6rem',
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
    marginTop: theme.spacing(0.25),
    textAlign: 'center',
    opacity: 0.8,
  },
}))

const ratingOptions = [
  {
    value: -2,
    icon: SentimentVeryDissatisfied,
    label: 'Wasted my time',
    color: '#f44336',
  },
  {
    value: -1,
    icon: SentimentDissatisfied,
    label: 'Not helpful',
    color: '#ff9800',
  },
  { value: 0, icon: SentimentNeutral, label: 'Neutral', color: '#9e9e9e' },
  {
    value: 1,
    icon: SentimentSatisfied,
    label: 'Saved me time',
    color: '#8bc34a',
  },
  {
    value: 2,
    icon: SentimentVerySatisfied,
    label: 'Huge time saver!',
    color: '#4caf50',
  },
]

export default function Rating({ messageId, onRate }) {
  const classes = useStyles()
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedRating, setSelectedRating] = useState(null)
  const [showThanks, setShowThanks] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  const handleOptionClick = (value) => {
    setSelectedRating(value)
    setShowThanks(true)
    if (onRate) {
      onRate(messageId, value)
    }

    // Start fade out after 2 seconds
    setTimeout(() => {
      setFadeOut(true)
    }, 2000)
  }

  // Show thank you message after rating
  if (showThanks) {
    return (
      <Fade in={!fadeOut} timeout={500}>
        <Box className={classes.ratingContainer}>
          <Typography className={classes.thankYouMessage}>
            Thanks for your feedback!
          </Typography>
        </Box>
      </Fade>
    )
  }

  // Show collapsed state initially
  if (!isExpanded) {
    return (
      <Fade in timeout={300}>
        <Box
          className={classes.collapsedButton}
          onClick={() => setIsExpanded(true)}
        >
          Rate this conversation
        </Box>
      </Fade>
    )
  }

  return (
    <Fade in timeout={300}>
      <Box>
        <Box className={classes.ratingContainer}>
          <IconButton
            className={classes.closeButton}
            onClick={() => setIsExpanded(false)}
            size="small"
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography className={classes.ratingQuestion}>
            Have I saved you time today?
          </Typography>
          <div className={classes.optionsContainer}>
            {ratingOptions.map((option) => {
              const IconComponent = option.icon
              return (
                <div
                  key={option.value}
                  className={`${classes.optionButton} ${
                    selectedRating === option.value ? 'selected' : ''
                  }`}
                  onClick={() => handleOptionClick(option.value)}
                >
                  <IconComponent
                    className={classes.optionIcon}
                    sx={{ color: option.color }}
                  />
                  <Typography className={classes.optionLabel}>
                    {option.label}
                  </Typography>
                </div>
              )
            })}
          </div>
        </Box>
        <Typography
          className={classes.privacyNotice}
          sx={{
            fontSize: '0.6rem !important',
            opacity: 0.8,
          }}
        >
          Ratings collect anonymous usage metrics, and no chat content is shared
        </Typography>
      </Box>
    </Fade>
  )
}

Rating.propTypes = {
  messageId: PropTypes.string.isRequired,
  onRate: PropTypes.func,
}
