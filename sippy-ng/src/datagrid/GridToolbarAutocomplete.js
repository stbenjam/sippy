import { safeEncodeURIComponent } from '../helpers'
import Autocomplete from '@material-ui/lab/Autocomplete'
import CircularProgress from '@material-ui/core/CircularProgress'
import PropTypes from 'prop-types'
import React, { useEffect } from 'react'
import TextField from '@material-ui/core/TextField'

export default function GridToolbarAutocomplete(props) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  const fetchOptions = async (value) => {
    setLoading(true)
    let queryParams = ''
    if (value !== '') {
      queryParams = '?search=' + safeEncodeURIComponent(value)
    }

    const response = await fetch(
      process.env.REACT_APP_API_URL +
        `/api/autocomplete/${props.field}${queryParams}`
    )

    const values = await response.json()
    let valueObj = []
    values.forEach((v) => valueObj.push({ name: v }))
    setOptions(valueObj)
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      fetchOptions(props.value)
    } else {
      setOptions([])
    }
  }, [open])

  return (
    <Autocomplete
      disableClearable
      id={`autocomplete-${props.id}`}
      style={{ width: 220 }}
      open={open}
      onOpen={() => {
        setOpen(true)
      }}
      onClose={() => {
        setOpen(false)
      }}
      onChange={(e, v) => v && props.onChange(v.name)}
      defaultValue={{ name: props.value }}
      getOptionSelected={(option, value) => option.name === value.name}
      getOptionLabel={(option) => option.name}
      options={options}
      loading={loading}
      renderInput={(params) => (
        <TextField
          {...params}
          id={props.id}
          label={props.label}
          onChange={(ev) => {
            // dont fire API if the user delete or not entered anything
            if (ev.target.value !== '' || ev.target.value !== null) {
              fetchOptions(ev.target.value)
            }
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  )
}

GridToolbarAutocomplete.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  release: PropTypes.string,
  field: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
}
