/** @jest-environment setup-polly-jest/jest-environment-node */

import 'jsdom-global/register'
import React from 'react'
import { act } from '@testing-library/react'
import { QueryParamProvider } from 'use-query-params'
import { mount } from 'enzyme'
import { setupPolly } from 'setup-polly-jest'
import { withoutMuiID } from '../setupTests'
import path from 'path'
import { BrowserRouter } from 'react-router-dom'
import TestTable from './TestTable'

jest.useRealTimers()

describe('TestTable', () => {
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
                        <TestTable release="4.9"
                                  filterBy={['name', 'trt']}
                                  test="available"
                                  sortBy="improvement"
                                  limit={5}
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
