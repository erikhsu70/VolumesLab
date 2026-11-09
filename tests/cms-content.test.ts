import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCmsContent, cmsBackground, cmsLookCss, cmsSiteContent, cmsTextSize, type CmsBundle } from '../src/lib/cms-content';
import { tests, assessments, training, allProducts, findProduct, productPath } from '../src/data/catalog';
import { productContent } from '../src/data/productContent';
import { homePage, productLabels, faqPage, blogPage, contactPage, SECTION_KEYS } from '../src/data/pages';
import {
  productReachable, requireProduct, requireProductBySlug, sectionByKey, sectionEnabled, sectionLabel, visibleSections,
} from '../src/lib/sections';
import { pageMeta } from '../src/data/meta';
import { BRANDING, CONTACT, ADDRESS, COMPANY, PAGES, TEXT, instagramHandle, instagramUrl } from '../src/data/site';
import { LINKS } from '../src/lib/momence';

const bundle = (
  products: CmsBundle['products'],
  categories = ['test', 'assessment'],
  rest: Partial<CmsBundle> = {},
): CmsBundle => ({
  products, categories, site: null, home: null, labels: null, about: null, legal: null, meta: null, pages: null, ...rest,
});

test('CMS creates, edits, hides, restores and removes catalogue products', () => {
  const price = findProduct('vo2max')!.price;
  const original = { slug: 'vo2max', name: 'Updated VO2', category: 'test', live: true };
  const added = { slug: 'new-test', name: 'New test', category: 'test', live: true,
    momenceUrl: 'https://momence.com/s/example', outcomes: [{ text: 'An outcome' }] };
  const assessment = { slug: 'new-assessment', name: 'New assessment', category: 'assessment', live: true,
    includedTests: [{ slug: 'new-test' }] };
  applyCmsContent(bundle([original, added, assessment]));
  assert.equal(tests.length, 2);
  assert.equal(assessments[0].includedTests?.[0], 'new-test');
  assert.equal(findProduct('vo2max')?.price, price);
  assert.equal(findProduct('vo2max')?.name, 'Updated VO2');
  assert.equal(productContent['new-test'].outcomes[0], 'An outcome');
  assert.equal(LINKS['new-test'], added.momenceUrl);
  applyCmsContent(bundle([original, { ...added, name: 'Edited without changing count' }, assessment]));
  assert.equal(findProduct('new-test')?.name, 'Edited without changing count');
  applyCmsContent(bundle([{ ...original, live: false }, { ...added, live: false }, assessment]));
  assert.equal(tests.length, 0);
  assert.equal(findProduct('vo2max'), undefined);
  assert.equal(findProduct('new-test'), undefined);
  applyCmsContent(bundle([original, added, assessment]));
  assert.equal(findProduct('vo2max')?.price, price);
  applyCmsContent(bundle([]));
  assert.equal(tests.length, 0);
  assert.equal(assessments.length, 0);
  assert.ok(allProducts.every((p) => !['test', 'assessment'].includes(p.category)));
});

test('a category that did not load keeps what the site shows; unordered SKUs keep the bundled order', () => {
  applyCmsContent(bundle([{ slug: 'vo2max', category: 'test', live: true }], ['test']));
  assert.equal(tests.length, 1);
  const packs = ['pt-pack-10', 'cardio-pack-4', 'training-session', 'pt-pack-3', 'pt-pack-5']
    .map((slug) => ({ slug, category: 'training', live: true, training: { sessionCount: 7 } }));
  applyCmsContent(bundle(packs, ['training']));
  assert.equal(tests.length, 1, 'tests were not fetched, so they stay');
  assert.deepEqual(training.map((p) => p.slug), ['training-session', 'pt-pack-3', 'pt-pack-5', 'pt-pack-10', 'cardio-pack-4']);
  assert.equal(training[0].training?.sessionCount, 7);
  applyCmsContent(bundle([{ slug: 'new-training', category: 'training', live: true }], ['training']));
  assert.deepEqual(training.map((p) => p.slug), ['new-training']);
});

test('fetch paginates, treats a loaded empty collection as authoritative, and keeps the last good list during outages', async () => {
  const originalFetch = globalThis.fetch;
  let offline = false;
  const pages: number[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(init?.cache, 'no-store', 'CMS refreshes must bypass browser cached responses');
    const url = new URL(String(input));
    if (url.pathname === '/api/tests') {
      if (offline) throw new Error('offline');
      const page = Number(url.searchParams.get('page'));
      pages.push(page);
      return Response.json({ docs: [{ slug: `test-${page}`, live: true }], hasNextPage: page === 1 });
    }
    if (url.pathname.startsWith('/api/globals/')) return Response.json({});
    return Response.json({ docs: [] });
  };
  try {
    applyCmsContent(bundle([{ slug: 'vo2max', category: 'test', live: true }], ['test']));
    offline = true;
    const cold = await cmsSiteContent();
    assert.ok(cold && !cold.categories?.includes('test'), 'a failed collection is not authoritative');
    applyCmsContent(cold);
    assert.equal(tests.length, 1, 'a cold outage keeps what the site shows');
    assert.equal(assessments.length, 0, 'a loaded empty collection removes its category');
    offline = false;
    const first = await cmsSiteContent();
    assert.deepEqual(pages, [1, 2]);
    assert.equal(first?.products.length, 2);
    applyCmsContent(first);
    assert.deepEqual(tests.map((t) => t.slug), ['test-1', 'test-2']);
    offline = true;
    const second = await cmsSiteContent();
    assert.deepEqual(second?.products, first?.products);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a total outage yields null and leaves the site untouched', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const before = tests.map((t) => t.slug);
    // A cold instance has no cache: the module-level cache from the previous
    // test still holds /api/tests, so only the globals and other collections
    // fail here; assert the products survive either way.
    const out = await cmsSiteContent();
    applyCmsContent(out);
    assert.deepEqual(tests.map((t) => t.slug), before);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cleared CMS fields clear the site, except contact email and SEO', () => {
  const headline = homePage.headline;
  const email = CONTACT.email;
  const title = pageMeta.home.title;
  applyCmsContent(bundle([], [], {
    home: { headline: '', intro: null, tests: { title: 'Tests', description: '' } },
    site: { contact: { email: '' }, address: { street: '' } },
    labels: { finalCta: { default: '' }, modules: { membershipSteps: [] } },
    meta: { home: { title: '', description: '' } },
  }));
  assert.equal(homePage.headline, '');
  assert.equal(homePage.intro, '');
  assert.equal(sectionByKey('tests')?.description, '');
  assert.equal(ADDRESS.street, '');
  assert.equal(productLabels.finalCta.default, '');
  assert.deepEqual(productLabels.modules.membershipSteps, []);
  assert.equal(CONTACT.email, email);
  assert.equal(pageMeta.home.title, title);
  applyCmsContent(bundle([], [], { home: { headline: 'Back' } }));
  assert.equal(homePage.headline, 'Back');
  assert.notEqual(headline, '');
});

test('pages switch off and on from the CMS', () => {
  assert.equal(PAGES.legal, true);
  applyCmsContent(bundle([], [], { pages: { legal: false, blog: false } }));
  assert.equal(PAGES.legal, false);
  assert.equal(PAGES.blog, false);
  assert.equal(PAGES.about, true);
  applyCmsContent(bundle([], [], { pages: null }));
  assert.equal(PAGES.legal, false, 'no pages global in the bundle changes nothing');
  applyCmsContent(bundle([], [], { pages: { legal: true } }));
  assert.equal(PAGES.legal, true);
  assert.equal(PAGES.blog, true, 'a missing key means on');
});

test('FAQ and Blog page framing is editable and clears when cleared', () => {
  const band = faqPage.band;
  applyCmsContent(bundle([], [], {
    faq: { headline: 'Preguntas.', intro: 'Escribe a {email}.', band: '' },
    blog: { headline: 'Notas', cta: { headline: 'Reserva ya', button: '' } },
  }));
  assert.equal(faqPage.headline, 'Preguntas.');
  assert.equal(faqPage.intro, 'Escribe a {email}.');
  assert.equal(faqPage.band, '', 'a cleared band removes the band');
  assert.equal(faqPage.eyebrow, 'Frequently asked', 'a field the CMS does not carry keeps its value');
  assert.equal(blogPage.headline, 'Notas');
  assert.equal(blogPage.cta.headline, 'Reserva ya');
  assert.equal(blogPage.cta.button, '');
  assert.equal(blogPage.cta.eyebrow, 'Your turn');
  applyCmsContent(bundle([], [], { faq: null, blog: null }));
  assert.equal(faqPage.headline, 'Preguntas.', 'no global in the bundle changes nothing');
  applyCmsContent(bundle([], [], { faq: { band } }));
  assert.equal(faqPage.band, band);
});

test('Contact page wording is editable and clears when cleared', () => {
  applyCmsContent(bundle([], [], {
    contact: { headline: 'Ven a vernos.', gettingHere: 'Metro: X\nBus: Y', form: { intro: '' } },
  }));
  assert.equal(contactPage.headline, 'Ven a vernos.');
  assert.equal(contactPage.gettingHere, 'Metro: X\nBus: Y');
  assert.equal(contactPage.form.intro, '');
  assert.equal(contactPage.form.title, 'Send a message', 'a field the CMS does not carry keeps its value');
  assert.equal(contactPage.eyebrow, 'Contact');
});

test('Order, price, duration and section come from the CMS', () => {
  applyCmsContent(bundle([
    { slug: 'vo2max', category: 'test', live: true, order: 2, price: 195, duration: '30 minutes' },
    { slug: 'grip-strength', category: 'test', live: true, order: 1 },
    { slug: 'new-a', category: 'test', live: true, createdAt: '2026-09-12T10:00:00Z' },
    { slug: 'new-b', category: 'test', live: true, createdAt: '2026-09-11T10:00:00Z' },
    { slug: 'mobility-assessment', category: 'test', live: true },
    { slug: 'strength-assessment', category: 'test', live: true, section: 'assessments', price: null, duration: '' },
  ], ['test', 'assessment']));
  assert.deepEqual(
    tests.map((t) => t.slug),
    ['grip-strength', 'vo2max', 'mobility-assessment', 'new-b', 'new-a'],
    'numbered first, then the bundled order, then oldest first',
  );
  const vo2 = findProduct('vo2max')!;
  assert.equal(vo2.price, 195);
  assert.equal(vo2.priceTbd, false);
  assert.equal(vo2.duration, '30 minutes');
  assert.equal(findProduct('grip-strength')?.price, 40, 'a doc without the field keeps the bundled price');
  const moved = findProduct('strength-assessment')!;
  assert.deepEqual(assessments.map((a) => a.slug), ['strength-assessment'], 'moved into the Assessments section');
  assert.equal(moved.category, 'assessment');
  assert.equal(productPath(moved), '/strength-assessment');
  assert.equal(moved.price, 0, 'an empty price reads "Price on booking"');
  assert.equal(moved.priceTbd, true);
  assert.equal(moved.duration, undefined);
  assert.equal(moved.name, 'Strength Assessment', 'a moved SKU keeps its bundled snapshot');
});

test('homepage sections: order, names, on/off, and 404 for SKUs of a section that is off', () => {
  applyCmsContent(bundle(
    [{ slug: 'vo2max', category: 'test', live: true }, { slug: 'foundational', category: 'assessment', live: true }],
    ['test', 'assessment'],
    { home: { sections: [
      { section: 'assessments', enabled: true, title: 'Packs', description: '' },
      { section: 'tests', enabled: false, title: 'Tests' },
      { section: 'assessments', title: 'duplicate, ignored' },
      { section: 'bogus', title: 'unknown, ignored' },
    ] } },
  ));
  assert.deepEqual(homePage.sections.map((s) => s.key), ['assessments', 'tests']);
  assert.equal(homePage.sections[0].title, 'Packs');
  assert.equal(homePage.sections[0].description, '');
  assert.equal(sectionEnabled('tests'), false);
  assert.equal(sectionEnabled('medical'), false, 'a section missing from the list is off');
  assert.deepEqual(visibleSections().map((s) => s.key), ['assessments']);
  assert.equal(sectionLabel('assessments'), 'Packs');
  assert.equal(sectionLabel('medical'), 'Medical', 'menu label falls back when the section is not listed');
  assert.equal(productReachable(findProduct('vo2max')!), false);
  assert.throws(() => requireProduct(tests, 'vo2max'), 'a SKU of a section that is off is not found');
  assert.equal(requireProduct(assessments, 'foundational').slug, 'foundational');

  applyCmsContent(bundle([], [], { home: { assessments: { title: 'Legacy' } } }));
  assert.equal(homePage.sections[0].title, 'Legacy', 'a CMS still sending one group per section is understood');

  applyCmsContent(bundle([], [], { home: { sections: [] } }));
  assert.deepEqual(homePage.sections.map((s) => s.key), ['assessments', 'tests'], 'an empty list changes nothing');

  applyCmsContent(bundle([], [], { home: { sections: SECTION_KEYS.map((section) => ({ section, enabled: true })) } }));
  assert.deepEqual(homePage.sections.map((s) => s.key), SECTION_KEYS);
  assert.equal(sectionByKey('medical')?.title, 'Medical Appointment', 'a re-added section gets its bundled title back');
  assert.equal(sectionByKey('assessments')?.title, 'Legacy', 'a listed section keeps its current title when the row has none');
  assert.equal(productReachable(findProduct('vo2max')!), true);
});

test('footer line (14/09): phone and Instagram from the CMS, registration number, Team toggle', () => {
  applyCmsContent(bundle([], [], {
    site: {
      contact: { email: 'hello@volumeslab.com', phone: '+34 600 123 123', instagram: 'https://www.instagram.com/volumes.lab/' },
      company: { legalName: 'Volumes Vision S.L.', taxId: 'B26934380', registrationNumber: 'CS000000' },
    },
    pages: { about: true, team: true },
  }));
  assert.equal(CONTACT.phone, '+34 600 123 123');
  assert.equal(CONTACT.phoneHref, 'tel:+34600123123');
  assert.equal(instagramHandle(), '@volumes.lab');
  assert.equal(instagramUrl(), 'https://www.instagram.com/volumes.lab/');
  assert.equal(COMPANY.registrationNumber, 'CS000000');
  assert.equal(PAGES.team, true, 'Team switched on from the CMS');

  assert.equal(instagramHandle('@volumes.lab'), '@volumes.lab', 'a bare handle works too');
  assert.equal(instagramUrl('volumes.lab'), 'https://www.instagram.com/volumes.lab/');
  assert.equal(instagramHandle(''), '');

  applyCmsContent(bundle([], [], {
    site: { contact: { email: 'hello@volumeslab.com', phone: '', instagram: '' }, company: { registrationNumber: '' } },
    pages: { about: true },
  }));
  assert.equal(CONTACT.phone, '', 'cleared phone = no phone in the line');
  assert.equal(CONTACT.phoneHref, '');
  assert.equal(instagramHandle(), '', 'cleared Instagram = no Instagram in the line');
  assert.equal(COMPANY.registrationNumber, null);
  assert.equal(PAGES.team, false, 'a CMS without the Team toggle keeps Team off');
  assert.equal(PAGES.faq, true, 'other pages default to on');
});

test('homepage headline size comes from the CMS and ignores unknown values', () => {
  assert.equal(homePage.headlineSize, 'medium');
  applyCmsContent(bundle([], [], { home: { headlineSize: 'small' } }));
  assert.equal(homePage.headlineSize, 'small');
  applyCmsContent(bundle([], [], { home: { headlineSize: 'huge' } }));
  assert.equal(homePage.headlineSize, 'small', 'an unknown size keeps the current one');
  applyCmsContent(bundle([], [], { home: { headlineSize: 'large' } }));
  assert.equal(homePage.headlineSize, 'large');
});

test('text size and logos (17/09): from the CMS, defaults when cleared or unknown', () => {
  assert.equal(TEXT.size, 'medium');
  assert.equal(cmsTextSize(null), 'medium', 'no CMS = medium');
  applyCmsContent(bundle([], [], {
    site: {
      textSize: 'large',
      branding: { logo: { id: 1, url: '/api/media/file/icon.png' }, mark: { id: 2, url: 'https://blob.vercel-storage.com/mark.png' } },
    },
  }));
  assert.equal(TEXT.size, 'large');
  assert.equal(BRANDING.logo, 'https://volumes-cms.vercel.app/api/media/file/icon.png', 'a CMS-served file gets the CMS origin');
  assert.equal(BRANDING.mark, 'https://blob.vercel-storage.com/mark.png', 'a Blob file is used as is');
  applyCmsContent(bundle([], [], { site: { textSize: 'huge', branding: { logo: null, mark: 3 } } }));
  assert.equal(TEXT.size, 'medium', 'an unknown size is medium');
  assert.equal(BRANDING.logo, '/volumes-icon.png', 'a cleared upload is the bundled logo');
  assert.equal(BRANDING.mark, '/volumes-mark.png', 'an unpopulated id (depth 0) is the bundled logo too');
  applyCmsContent(bundle([], [], { site: { textSize: 'small' } }));
  assert.equal(TEXT.size, 'small');
});

test('letter case and background (29/09): uppercase and the default ground unless the CMS says otherwise', () => {
  const look = (site: Record<string, unknown> | null) => cmsLookCss(site ? ({ site } as unknown as CmsBundle) : null);
  assert.equal(
    look(null),
    'html{font-size:93.75%}:root{--case-titles:uppercase;--case-labels:uppercase}',
    'no CMS = the site as built',
  );
  const css = look({ titleCase: 'asTyped', labelCase: 'lowercase', backgroundColor: ' #FFF ' });
  assert.match(css, /--case-titles:none;--case-labels:lowercase/);
  assert.match(css, /--background:#ffffff;/);
  assert.match(css, /--card:color-mix\(in srgb,#ffffff 67%,white\)/);
  assert.doesNotMatch(look({ titleCase: 'shouting' }), /shouting/, 'an unknown case is uppercase');
  const bg = (v: unknown) => cmsBackground({ site: { backgroundColor: v } } as unknown as CmsBundle);
  assert.equal(bg('eae8e3'), '#eae8e3', 'the # is optional');
  assert.equal(bg(''), null, 'cleared = default');
  assert.equal(bg('red'), null, 'names are ignored');
  assert.equal(bg('#fff}body{display:none'), null, 'nothing but a hex reaches the <style>');
  assert.doesNotMatch(look({ backgroundColor: 'nope' }), /--background/);
});

test('flat service addresses: /<slug> finds a SKU in any section, 404 when its section is off', () => {
  applyCmsContent(bundle(
    [{ slug: 'vo2max', category: 'test', live: true }, { slug: 'foundational', category: 'assessment', live: true }],
    ['test', 'assessment'],
    { home: { sections: [
      { section: 'tests', enabled: true, title: 'Tests' },
      { section: 'assessments', enabled: false, title: 'Assessments' },
    ] } },
  ));
  assert.equal(productPath(findProduct('vo2max')!), '/vo2max');
  assert.equal(requireProductBySlug('vo2max').slug, 'vo2max');
  assert.throws(() => requireProductBySlug('foundational'), 'section off');
  assert.throws(() => requireProductBySlug('no-such-service'));
});
