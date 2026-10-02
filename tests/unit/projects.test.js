import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectProjects, generateProjects } from '../../generate-projects.js';
import { validateProjectMetadata, validateManifest } from '../../js/projectValidation.js';

const valid = {
    id: 'sample', title: 'Sample', summary: 'A project', tech: ['Unity'],
    thumbnail: 'assets/thumb.png', order: 1, links: { repo: 'https://example.com' },
};

function fixture(t) {
    const tempDir = path.join(os.tmpdir(), 'opencode');
    fs.mkdirSync(tempDir, { recursive: true });
    const root = fs.mkdtempSync(path.join(tempDir, 'portfolio-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const dir of ['content/projects', 'assets', 'data']) fs.mkdirSync(path.join(root, dir), { recursive: true });
    fs.writeFileSync(path.join(root, 'assets/thumb.png'), 'test asset');
    const writeProject = (data = valid, filename = `${data.id}.md`, body = '') => {
        // JSON is valid YAML and keeps fixtures independent of formatting quirks.
        fs.writeFileSync(path.join(root, 'content/projects', filename), `---\n${JSON.stringify(data)}\n---\n${body}`);
    };
    return { root, writeProject };
}

test('metadata validates required fields, types, URLs and safe IDs', () => {
    assert.deepEqual(validateProjectMetadata(valid), []);
    for (const key of ['id', 'title', 'summary', 'thumbnail']) {
        assert.ok(validateProjectMetadata({ ...valid, [key]: '' }).length);
    }
    for (const changes of [
        { id: '../sample' }, { tech: 'Unity' }, { tech: [12] }, { order: '1' },
        { order: Infinity }, { links: [] }, { links: { repo: 'javascript:alert(1)' } },
    ]) assert.ok(validateProjectMetadata({ ...valid, ...changes }).length);
    assert.throws(() => validateManifest({}));
    assert.throws(() => validateManifest([valid, valid]), /duplicate/);
    assert.deepEqual(validateManifest([]), []);
});

test('drafts are ignored and valid projects are deterministic', (t) => {
    const { root, writeProject } = fixture(t);
    writeProject();
    fs.writeFileSync(path.join(root, 'content/projects/sample.draft.md'), '---\ninvalid: [\n');
    assert.deepEqual(collectProjects(root), [valid]);
    generateProjects(root);
    generateProjects(root, { check: true });
});

test('invalid source fails without overwriting an existing manifest', (t) => {
    const { root, writeProject } = fixture(t);
    const output = path.join(root, 'data/projects.json');
    fs.writeFileSync(output, 'existing user content');
    writeProject({ ...valid, title: '', thumbnail: 'assets/missing.png' });
    assert.throws(() => generateProjects(root), /missing asset/);
    assert.equal(fs.readFileSync(output, 'utf8'), 'existing user content');
});

test('IDs must match filenames and be unique', (t) => {
    const { root, writeProject } = fixture(t);
    writeProject();
    writeProject(valid, 'other.md');
    assert.throws(() => collectProjects(root), /must match[\s\S]*duplicate ID/);
});

test('screenshots resolve root-relative, encoded and Markdown-relative paths', (t) => {
    const { root, writeProject } = fixture(t);
    fs.writeFileSync(path.join(root, 'assets/screen shot.png'), 'test asset');
    writeProject(valid, 'sample.md', '![Root](/assets/thumb.png "Caption")\n![Relative](../../assets/screen%20shot.png)');
    assert.equal(collectProjects(root).length, 1);
    writeProject(valid, 'sample.md', '![Missing](/assets/missing.png)');
    assert.throws(() => collectProjects(root), /missing asset/);
    writeProject(valid, 'sample.md', '![Outside](../../../outside.png)');
    assert.throws(() => collectProjects(root), /outside site root/);
});

test('check mode detects stale output and validation mode never writes', (t) => {
    const { root, writeProject } = fixture(t);
    writeProject();
    generateProjects(root, { validate: true });
    assert.equal(fs.existsSync(path.join(root, 'data/projects.json')), false);
    assert.throws(() => generateProjects(root, { check: true }), /stale/);
});
