/** @jest-environment setup-polly-jest/jest-environment-node */

import '@testing-library/jest-dom'
import Enzyme from 'enzyme'
import Adapter from '@wojtekmaj/enzyme-adapter-react-17'
import { Polly } from '@pollyjs/core'
import HttpAdapter from '@pollyjs/adapter-node-http'
import FSPersister from '@pollyjs/persister-fs'
import fetch from 'node-fetch'

// https://github.com/mui-org/material-ui/issues/21293
export const withoutMuiID = (wrapper) => wrapper.html().replace(/id="mui-[0-9]*"/g, '').replace(/aria-labelledby="(mui-[0-9]* *)*"/g, '')

Enzyme.configure({ adapter: new Adapter() })

global.fetch = fetch

// See: https://github.com/vuejs/vue-test-utils/issues/974
global.requestAnimationFrame = cb => cb()
