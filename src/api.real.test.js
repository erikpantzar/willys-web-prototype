'use strict';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { addItem } from './api.real.js';

function stubFetch() {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 201, json: async () => ({ id: 1 }) }));
  vi.stubGlobal('localStorage', { getItem: () => 'https://tailnet.example' });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('addItem', () => {
  it('sends the picked candidate code and url to the list API', async () => {
    const fetchMock = stubFetch();
    await addItem('Mentos Fruit 3 Pack', 'Erik', '/produkt/Mentos-101276825_ST', '101276825_ST');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://tailnet.example/list/items');
    expect(JSON.parse(init.body)).toEqual({
      text: 'Mentos Fruit 3 Pack',
      addedBy: 'Erik',
      productUrl: '/produkt/Mentos-101276825_ST',
      code: '101276825_ST',
    });
  });

  it('leaves code out for a free-text item', async () => {
    const fetchMock = stubFetch();
    await addItem('gurka', 'Erik');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ text: 'gurka', addedBy: 'Erik' });
  });
});
