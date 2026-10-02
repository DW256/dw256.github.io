import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchMarkdown } from '../../js/markdown.js';
import { loadErrorMessage } from '../../js/loadError.js';

test('concurrent Markdown requests share a promise and cache successful content', async (t) => {
    let finish;
    const response = new Promise((resolve) => { finish = resolve; });
    const fetch = t.mock.method(globalThis, 'fetch', () => response);
    const first = fetchMarkdown('/concurrent.md');
    const second = fetchMarkdown('/concurrent.md');
    assert.equal(first, second);
    assert.equal(fetch.mock.callCount(), 1);
    finish(new Response('Markdown body'));
    assert.deepEqual(await Promise.all([first, second]), ['Markdown body', 'Markdown body']);
    assert.equal(await fetchMarkdown('/concurrent.md'), 'Markdown body');
    assert.equal(fetch.mock.callCount(), 1);
});

test('failed HTTP requests are deduplicated but do not poison retries', async (t) => {
    let attempts = 0;
    t.mock.method(globalThis, 'fetch', async () => {
        attempts++;
        return attempts === 1 ? new Response('Unavailable', { status: 503 }) : new Response('Recovered');
    });
    const first = fetchMarkdown('/retry.md');
    const second = fetchMarkdown('/retry.md');
    assert.equal(first, second);
    await assert.rejects(Promise.all([first, second]), { status: 503 });
    assert.equal(attempts, 1);
    assert.equal(await fetchMarkdown('/retry.md'), 'Recovered');
    assert.equal(attempts, 2);
});

test('network failures also release the pending request for retry', async (t) => {
    let attempts = 0;
    t.mock.method(globalThis, 'fetch', async () => {
        if (++attempts === 1) throw new TypeError('Failed to fetch');
        return new Response('Online again');
    });
    await assert.rejects(fetchMarkdown('/network.md'), TypeError);
    assert.equal(await fetchMarkdown('/network.md'), 'Online again');
});

test('load errors explain network, server and missing-library recovery', () => {
    assert.match(loadErrorMessage('skills', new TypeError('Failed to fetch')), /Check your connection/);
    assert.match(loadErrorMessage('skills', { status: 503 }), /server is temporarily unavailable/);
    assert.match(loadErrorMessage('skills', { code: 'MARKDOWN_UNAVAILABLE' }), /reload the page/);
});
