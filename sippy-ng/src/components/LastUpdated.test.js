import React from 'react'
import { act } from '@testing-library/react'
import toJson from 'enzyme-to-json'
import { withoutMuiID } from '../setupTests'
import LastUpdated from './LastUpdated'
import { mount } from 'enzyme'

const minute = 60 * 1000
const hour = minute * 60

jest.useRealTimers()

describe(LastUpdated, () => {
  it('shows minutes when < an hour', async () => {
    const lastUpdated = new Date(0)
    Date.now = jest.fn(() => 10 * minute)

    let wrapper
    await act(async () => {
      wrapper = mount(<LastUpdated lastUpdated={lastUpdated} />)
    })

    expect(wrapper.html()).toContain('Last updated 10 minutes ago')
    expect(toJson(withoutMuiID(wrapper))).toMatchSnapshot()
  })

  it('shows hours when > an hour', async () => {
    const lastUpdated = new Date(0)
    Date.now = jest.fn(() => 3 * hour)

    let wrapper
    await act(async () => {
      wrapper = mount(<LastUpdated lastUpdated={lastUpdated} />)
    })

    expect(wrapper.html()).toContain('Last updated 3 hours ago')
    expect(toJson(withoutMuiID(wrapper))).toMatchSnapshot()
  })
})
