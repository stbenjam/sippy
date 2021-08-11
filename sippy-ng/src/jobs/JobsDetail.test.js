/** @jest-environment setup-polly-jest/jest-environment-node */

import 'jsdom-global/register'
import React from 'react'
import { act } from '@testing-library/react'
import { QueryParamProvider } from 'use-query-params'
import { mount } from 'enzyme'
import { setupPolly } from 'setup-polly-jest'
import toJson from 'enzyme-to-json'
import { withoutMuiID } from '../setupTests'
import path from 'path'
import { BrowserRouter } from 'react-router-dom'
import JobsDetail from './JobsDetail'

jest.useRealTimers()

describe('JobsDetail', () => {
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

  it('should match snapshot', async () => {
    let wrapper
    await act(async () => {
      wrapper = mount(
                <QueryParamProvider>
                    <BrowserRouter>
                        <JobsDetail release="4.9"
                                   filter="4.9-e2e-gcp-upgrade"
                        />
                    </BrowserRouter>)
                </QueryParamProvider>)
    })

    expect(wrapper.exists).toBeTruthy()

    // Wait for data to load...
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000))
    })
    wrapper.update()

    expect(withoutMuiID(wrapper)).toMatchSnapshot()
  })
})
