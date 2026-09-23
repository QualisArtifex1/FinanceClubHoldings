import { readFile, writeFile, readdir } from 'node:fs/promises'
const assets = await readdir('dist/assets')
const js = await readFile('dist/assets/' + assets.find(name => name.endsWith('.js')), 'utf8')
const css = await readFile('dist/assets/' + assets.find(name => name.endsWith('.css')), 'utf8')
const crest = 'data:image/png;base64,' + await readFile('public/dcc-crest.png', 'base64')
const bundle = js.replaceAll('./dcc-crest.png', crest)
const bootstrap = "document.querySelector('base')?.remove();const appScript=document.createElement('script');appScript.type='module';appScript.textContent=" + JSON.stringify(bundle).replaceAll('<', '\\u003c') + ";document.body.appendChild(appScript);"
const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#102b3a"><title>Finance Club | Design Preview</title><link rel="icon" href="' + crest + '"><style>' + css + '</style></head><body><a class="skip-link" href="#main-content">Skip to dashboard</a><div id="root"></div><script>' + bootstrap + '</script></body></html>'
await writeFile('preview.html', html)
await writeFile('dist/preview.html', html)
