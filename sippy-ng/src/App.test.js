/** @jest-environment setup-polly-jest/jest-environment-node */

import 'jsdom-global/register'
import App from './App'
import React from 'react'
import { act } from '@testing-library/react'
import { mount } from 'enzyme'
import { setupPolly } from 'setup-polly-jest'
import toJson from 'enzyme-to-json'
import { withoutMuiID } from './setupTests'
import path from 'path'

jest.useRealTimers()

describe('app', () => {
  const context = setupPolly({})

  beforeEach(() => {
    context.polly.configure({
      adapters: [require('@pollyjs/adapter-node-http')],
      persister: require('@pollyjs/persister-fs'),
      persisterOptions: {
        fs: {
          recordingsDir: path.resolve(__dirname, '../__recordings__')
        }
      }
    }
    )
  })

  it('should fetch correctly', async () => {
    let wrapper
    await act(async () => {
      wrapper = mount(<App/>)
    })

    expect(wrapper.exists).toBeTruthy()
    expect(wrapper.find('p').text()).toContain('Loading...')

    // Wait for data to load...
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    wrapper.update()

    expect(withoutMuiID(wrapper)).toMatchSnapshot()
  })
})
