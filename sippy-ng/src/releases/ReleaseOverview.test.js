/** @jest-environment setup-polly-jest/jest-environment-node */

import 'jsdom-global/register'
import React from 'react'
import { act } from '@testing-library/react'
import { mount } from 'enzyme'
import toJson from 'enzyme-to-json'
import ReleaseOverview from './ReleaseOverview'
import { BrowserRouter } from 'react-router-dom'
import { QueryParamProvider } from 'use-query-params'
import { withoutMuiID } from '../setupTests'
import { setupPolly } from 'setup-polly-jest'
import path from 'path'

jest.useRealTimers()

describe('release-overview', () => {
  const context = setupPolly({})

  beforeEach(() => {
    context.polly.configure({
      adapters: [require('@pollyjs/adapter-node-http')],
      persister: require('@pollyjs/persister-fs'),
      persisterOptions: {
        fs: {
          recordingsDir: path.resolve(__dirname, '../../__recordings__')
        }
      }
    }
    )
  })

  it('should render correctly', async () => {
    let wrapper
    await act(async () => {
      wrapper = mount(
          <QueryParamProvider>
            <BrowserRouter>
              <ReleaseOverview release="4.9" />
            </BrowserRouter>
          </QueryParamProvider>
      )
    })

    expect(wrapper.exists).toBeTruthy()
    expect(wrapper.html()).toContain('Loading')

    // Wait for data to load...
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    wrapper.update()

    expect(withoutMuiID(wrapper)).toMatchSnapshot()
  })
})
