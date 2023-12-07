import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  Link,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
} from '@mui/material'
import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'

export default function VariantSelector(props) {
  const {
    release,
    defaultExcludedVariants,
    excludedVariants,
    setExcludedVariants,
  } = props
  const [options, setOptions] = useState([])
  const [selectedValues, setSelectedValues] = useState(excludedVariants)

  useEffect(() => {
    fetch(process.env.REACT_APP_API_URL + '/api/variants?release=' + release)
      .then((response) => response.json())
      .then((data) => {
        // Extract "name" from the API response and set it as options
        const optionValues = data.map((item) => item.name)
        setOptions(optionValues.sort())
      })
      .catch((error) => console.error(error))
  }, [])

  const handleChange = (event) => {
    setSelectedValues(event.target.value)
  }

  const updateVariants = () => {
    if (!arraysEqual(selectedValues, excludedVariants)) {
      setExcludedVariants(selectedValues)
    }
  }

  const arraysEqual = (a, b) => {
    if (a === b) return true
    if (a == null || b == null) return false
    if (a.length !== b.length) return false

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  return (
    <FormControl sx={{ m: 1, width: 300 }}>
      <InputLabel id="exclude-variants-selector">Exclude Variants</InputLabel>
      <Select
        labelId="exclude-variants-selector"
        multiple
        input={<OutlinedInput label="Excluded Variants" />}
        value={selectedValues}
        onChange={handleChange}
        onClose={updateVariants}
        renderValue={(selected) => selected.join(', ')}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            <Checkbox checked={selectedValues.indexOf(option) > -1} />
            <ListItemText primary={option} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

VariantSelector.propTypes = {
  release: PropTypes.string.isRequired,
  defaultExcludedVariants: PropTypes.arrayOf(PropTypes.string).isRequired,
  excludedVariants: PropTypes.arrayOf(PropTypes.string).isRequired,
  setExcludedVariants: PropTypes.func,
}
