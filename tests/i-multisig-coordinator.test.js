// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

import { describe, expect, test } from '@jest/globals'

import { toJsonSafe } from '../index.js'

describe('toJsonSafe', () => {
  test('converts a BigInt to a decimal string', () => {
    expect(toJsonSafe(123n)).toBe('123')
  })

  test('converts a byte array to a 0x-prefixed hex string', () => {
    expect(toJsonSafe(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe('0xdeadbeef')
  })

  test('converts a Date to an ISO-8601 string', () => {
    expect(toJsonSafe(new Date('2026-08-21T00:00:00.000Z'))).toBe('2026-08-21T00:00:00.000Z')
  })

  test('recursively converts nested objects and arrays', () => {
    const input = {
      amount: 5n,
      data: new Uint8Array([0x01, 0x02]),
      when: new Date('2026-08-21T00:00:00.000Z'),
      nested: [7n]
    }

    const result = toJsonSafe(input)

    expect(result).toEqual({
      amount: '5',
      data: '0x0102',
      when: '2026-08-21T00:00:00.000Z',
      nested: ['7']
    })
    expect(JSON.stringify(result)).toBe('{"amount":"5","data":"0x0102","when":"2026-08-21T00:00:00.000Z","nested":["7"]}')
  })
})
