import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const libraries = [
    ['marked@18.0.6/lib/marked.umd.js', 'node_modules/marked/lib/marked.umd.js'],
    ['dompurify@3.4.16/dist/purify.min.js', 'node_modules/dompurify/dist/purify.min.js'],
];
const projectCount = JSON.parse(fs.readFileSync('data/projects.json', 'utf8')).length;

test.beforeEach(async ({ page }) => {
    // Run against the exact SRI-checked production libraries without depending on a CDN.
    for (const [url, file] of libraries) {
        await page.route(`https://cdn.jsdelivr.net/npm/${url}`, (route) => route.fulfill({
            body: fs.readFileSync(file), contentType: 'text/javascript',
            headers: { 'access-control-allow-origin': '*' },
        }));
    }
    await page.route('https://cdnjs.cloudflare.com/**', (route) => route.abort());
});

async function ready(page, url = '/') {
    await page.goto(url);
    await expect(page.locator('#intro h1')).toHaveText('Dwi Wahyu Aji Kurniawan');
    await expect(page.locator('#project-grid [data-project]')).toHaveCount(projectCount);
}

async function openProject(page) {
    await ready(page);
    await page.locator('[data-project="epicon-x"]').click();
    await expect(page.locator('#modal-body details')).toBeVisible();
}

test('browser library pins match declared integrity hashes', () => {
    const html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');
    for (const [url, file] of libraries) {
        const hash = 'sha384-' + createHash('sha384').update(fs.readFileSync(file)).digest('base64');
        expect(html).toContain(`src="https://cdn.jsdelivr.net/npm/${url}"\n        integrity="${hash}"`);
    }
});

test('filters preserve focus and replace the grid immediately', async ({ page }) => {
    await ready(page);
    const filter = page.locator('#project-filters').getByRole('button', { name: 'MongoDB', exact: true });
    await filter.focus();
    await page.keyboard.press('Enter');
    await expect(filter).toBeFocused();
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#project-grid [data-project]')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(filter).toBeFocused();
    await expect(page.locator('#project-grid [data-project]')).toHaveCount(projectCount);
});

test('Back/Forward synchronizes filters, results, modal and focus', async ({ page }) => {
    await ready(page);
    await page.locator('#project-filters').getByRole('button', { name: 'MongoDB', exact: true }).click();
    await page.locator('[data-project="epicon-x"]').click();
    await expect(page.locator('#modal-body details')).toBeVisible();
    // Simulate a different filter state on the modal's history entry.
    await page.evaluate(() => {
        const params = new URLSearchParams(location.search);
        params.set('tech', 'PlayFab');
        history.replaceState(history.state, '', '?' + params);
    });
    await page.goBack();
    await expect(page.locator('#modal-root')).toBeHidden();
    await expect(page.locator('[data-project="epicon-x"]')).toBeFocused();
    await expect(page.locator('#project-filters').getByRole('button', { name: 'MongoDB', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.goForward();
    await expect(page.locator('#modal-root')).toBeVisible();
    await expect(page.locator('#project-filters').getByRole('button', { name: 'PlayFab', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#project-grid [data-project]')).toHaveCount(1);
    await expect(page.locator('[data-project="treeky-dns"]')).toBeAttached();
    await page.getByRole('button', { name: 'Close project details' }).click();
    await expect(page).toHaveURL(/tech=MongoDB$/);
    await expect(page.locator('[data-project="epicon-x"]')).toBeFocused();
});

test('modal closure and modal-only history preserve cards without replaying animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
        window.gridAnimationCount = 0;
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
            if (this.dataset?.project) window.gridAnimationCount++;
            return animate.apply(this, args);
        };
    });
    await ready(page);
    await page.evaluate(() => {
        window.originalCards = Array.from(document.querySelectorAll('#project-grid [data-project]'));
    });
    expect(await page.evaluate(() => window.gridAnimationCount)).toBe(projectCount);

    async function expectUnchangedGrid() {
        expect(await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('#project-grid [data-project]'));
            return cards.length === window.originalCards.length &&
                cards.every((card, index) => card === window.originalCards[index]);
        })).toBe(true);
        expect(await page.evaluate(() => window.gridAnimationCount)).toBe(projectCount);
    }

    for (const close of ['button', 'escape', 'backdrop', 'back']) {
        await page.locator('[data-project="epicon-x"]').click();
        await expect(page.locator('#modal-body details')).toBeVisible();
        if (close === 'button') await page.getByRole('button', { name: 'Close project details' }).click();
        else if (close === 'escape') await page.keyboard.press('Escape');
        // Mobile uses a full-screen panel; dispatch a backdrop click to cover its handler too.
        else if (close === 'backdrop') await page.locator('#modal-backdrop').dispatchEvent('click');
        else await page.goBack();
        await expect(page.locator('#modal-root')).toBeHidden();
        await expect(page).toHaveURL('/');
        await expect(page.locator('[data-project="epicon-x"]')).toBeFocused();
        await expectUnchangedGrid();
    }
    await page.goForward();
    await expect(page.locator('#modal-body details')).toBeVisible();
    await expectUnchangedGrid();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL('/');
    await page.locator('#project-filters').getByRole('button', { name: 'All', exact: true }).click();
    await expectUnchangedGrid();

    // A genuine filter change should still render and animate its new results.
    await page.locator('#project-filters').getByRole('button', { name: 'MongoDB', exact: true }).click();
    await expect(page.locator('#project-grid [data-project]')).toHaveCount(1);
    expect(await page.evaluate(() => window.gridAnimationCount)).toBe(projectCount + 1);
});

test('modal traps focus including summaries and excluding collapsed links', async ({ page }) => {
    await openProject(page);
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    const summary = page.locator('#modal-body summary');
    await summary.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#modal-body details')).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(page.locator('#modal-body details')).not.toHaveAttribute('open', '');
    const video = page.locator('#modal-body').getByRole('link', { name: 'Video', exact: true });
    await video.focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#modal-close')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(video).toBeFocused();
    await page.evaluate(() => {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Extra details';
        const hiddenLink = document.createElement('a');
        hiddenLink.href = 'https://example.com';
        hiddenLink.textContent = 'Collapsed link';
        details.append(summary, hiddenLink);
        document.getElementById('modal-body').appendChild(details);
    });
    const extraSummary = page.locator('#modal-body summary').last();
    await extraSummary.focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#modal-close')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(extraSummary).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root')).toBeHidden();
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
    await expect(page.locator('[data-project="epicon-x"]')).toBeFocused();
});

test('lightbox traps focus, keeps underlying modal inert and restores focus', async ({ page }) => {
    await openProject(page);
    const expand = page.locator('.carousel-slide.active .carousel-expand');
    await expand.focus();
    await page.keyboard.press('Enter');
    const viewer = page.getByRole('dialog', { name: 'Image viewer' });
    await expect(viewer).toBeVisible();
    await expect(page.locator('#modal-root')).toHaveAttribute('inert', '');
    const close = viewer.getByRole('button', { name: 'Close image viewer' });
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(viewer.getByRole('button', { name: 'Next image' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(viewer).toHaveCount(0);
    await expect(expand).toBeFocused();
    await expect(page.locator('#modal-root')).not.toHaveAttribute('inert', '');
    await expect(page.locator('main')).toHaveAttribute('inert', '');
});

test('carousel targets are large, keyboard focus pauses autoplay and pause stays paused', async ({ page }) => {
    await openProject(page);
    await page.clock.install();
    for (const selector of ['#modal-close', '.carousel-nav', '#carousel-autoplay']) {
        const box = await page.locator(selector).first().boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const dotBox = await page.locator('.carousel-dot').first().boundingBox();
    expect(dotBox.width).toBeGreaterThanOrEqual(24);
    expect(dotBox.height).toBeGreaterThanOrEqual(24);
    const expand = page.locator('.carousel-slide.active .carousel-expand');
    await expand.focus();
    const initial = await page.locator('.carousel-slide.active').getAttribute('aria-label');
    await page.clock.fastForward(10000);
    await expect(page.locator('.carousel-slide.active')).toHaveAttribute('aria-label', initial);
    await page.locator('.carousel-dot').first().focus();
    await page.clock.fastForward(10000);
    await expect(page.locator('.carousel-slide.active')).toHaveAttribute('aria-label', initial);
    await page.locator('#carousel-autoplay').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#carousel-autoplay')).toHaveAttribute('aria-label', 'Play slideshow');
    await page.locator('#modal-close').focus();
    await page.clock.fastForward(10000);
    await expect(page.locator('.carousel-slide.active')).toHaveAttribute('aria-label', initial);
    await page.locator('#carousel-autoplay').focus();
    await page.keyboard.press('Enter');
    await page.clock.fastForward(4100);
    await expect(page.locator('.carousel-slide.active')).not.toHaveAttribute('aria-label', initial);
});

test('reduced motion disables autoplay and carousel transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openProject(page);
    await expect(page.locator('#carousel-autoplay')).toHaveAttribute('aria-label', 'Play slideshow');
    await expect(page.locator('#carousel-track')).toHaveCSS('transition-duration', '0s');
    await expect(page.locator('#carousel-autoplay')).toBeDisabled();
});

test('carousel keeps compact dots, circular chevron controls and an overlay pause control', async ({ page }) => {
    await openProject(page);
    const dot = page.locator('.carousel-dot').first();
    await expect(dot).toHaveCSS('width', '24px');
    const dotSize = await dot.evaluate((element) => getComputedStyle(element, '::before').width);
    expect(dotSize).toBe('8px');
    const arrow = page.locator('.carousel-nav').first();
    const arrowSize = await arrow.evaluate((element) => getComputedStyle(element, '::before').width);
    expect(arrowSize).toBe('32px');
    const arrowHeight = await arrow.evaluate((element) => getComputedStyle(element, '::before').height);
    expect(arrowHeight).toBe(arrowSize);
    await expect(arrow.locator('i')).toHaveClass('fa-solid fa-chevron-left');
    await expect(arrow.locator('i')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.carousel-nav').nth(1).locator('i')).toHaveClass('fa-solid fa-chevron-right');
    const viewport = await page.locator('.carousel-viewport').boundingBox();
    const play = await page.locator('#carousel-autoplay').boundingBox();
    const dots = await page.locator('#carousel-dots').boundingBox();
    expect(play.y).toBeGreaterThanOrEqual(viewport.y);
    expect(play.y + play.height).toBeLessThanOrEqual(viewport.y + viewport.height);
    expect(dots.y).toBeCloseTo(viewport.y + viewport.height, 0);
    expect(dots.height).toBe(28);
    // Targets must not overlap despite the compact appearance.
    const first = await dot.boundingBox();
    const second = await page.locator('.carousel-dot').nth(1).boundingBox();
    expect(first.x + first.width).toBeLessThanOrEqual(second.x);
});

test('pointer and touch slideshow controls preserve explicit pause intent', async ({ page, isMobile }) => {
    await openProject(page);
    const button = page.locator('#carousel-autoplay');
    await expect(button).toHaveAttribute('aria-label', 'Pause slideshow');
    await expect(button.locator('i')).toHaveClass('fa-solid fa-pause');
    await expect(button.locator('i')).toHaveAttribute('aria-hidden', 'true');
    if (isMobile) await button.tap();
    else await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Play slideshow');
    await expect(button.locator('i')).toHaveClass('fa-solid fa-play');
    if (isMobile) await button.tap();
    else await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Pause slideshow');
    await expect(button.locator('i')).toHaveClass('fa-solid fa-pause');
});

test('denied storage never blocks page content or theme controls', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
    });
    await ready(page);
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click();
    await expect(page.locator('#skills-content')).toContainText('Unity');
    expect(errors).toEqual([]);
});

test('normalizes invalid filters and clears invalid direct project links', async ({ page }) => {
    await ready(page, '/?tech=Invalid,Unity,Unity&project=unknown#projects');
    await expect(page).toHaveURL(/\?tech=Unity#projects$/);
    await expect(page.locator('#modal-root')).toBeHidden();
    await expect(page.locator('#toast')).toHaveText('Project not found');
});

test('valid direct links close without leaving the site', async ({ page }) => {
    await ready(page, '/?project=epicon-x');
    await expect(page.locator('#modal-body details')).toBeVisible();
    await page.getByRole('button', { name: 'Close project details' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('#modal-root')).toBeHidden();
    await expect(page.locator('#project-grid')).toBeFocused();
});

test('bad manifests display a recoverable error instead of throwing', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/data/projects.json', (route) => route.fulfill({ json: [{ id: '../bad' }] }));
    await page.goto('/');
    await expect(page.locator('#project-grid')).toContainText('Unable to load projects');
    await expect(page.locator('#intro h1')).toBeVisible();
    expect(errors).toEqual([]);
});

test('missing Markdown libraries produce handled section errors', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/?project=epicon-x');
    await expect(page.locator('#project-grid [data-project]')).toHaveCount(projectCount);
    await expect(page.locator('#modal-body')).toContainText('Unable to load project details');
    expect(errors).toEqual([]);
});

test('failed project Markdown requests show an accessible error', async ({ page }) => {
    await page.route('**/content/projects/epicon-x.md', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
    await ready(page, '/?project=epicon-x');
    await expect(page.locator('#modal-body [role="status"]')).toContainText('Unable to load project details');
});
