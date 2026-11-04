from pathlib import Path
root=Path(__file__).resolve().parent
html=(root/'public/index.html').read_text()
css=(root/'public/style.css').read_text()
units=(root/'public/units.js').read_text().replace('export const ','const ').replace('export function ','function ')
regional=(root/'public/regional-recipes.js').read_text().replace('export const ','const ')
expansion=(root/'public/catalog-expansion.js').read_text().replace('export function ','function ')
data=(root/'public/data.js').read_text().replace("import {REGIONAL_RECIPES} from './regional-recipes.js';",'').replace("import {expandCatalog} from './catalog-expansion.js';",'').replace('export const ','const ')
shopping=(root/'public/shopping-core.js').read_text().replace('export function ','function ')
progress=(root/'public/generation-core.js').read_text().replace('export function ','function ')
app=(root/'public/app.js').read_text().replace("import {RECIPES, CATEGORIES, CATALOG_STATS} from './data.js';",'').replace("import {UNITS, normalizeUnit, parsePantryText, parseRecipeQuantity, standard, quantityLabel} from './units.js';",'').replace("import {resolveSelectedRecipes} from './shopping-core.js';",'').replace("import {createGenerationJob, commitGeneratedSlot, generationProgress, nextGenerationSlot} from './generation-core.js';",'')
html=html.replace('<link rel="stylesheet" href="./style.css" />',f'<style>\n{css}\n</style>')
html=html.replace('<script type="module" src="./app.js"></script>',f'<script type="module">\nwindow.DAPURCERDAS_STANDALONE=true;\n{units}\n{regional}\n{expansion}\n{data}\n{shopping}\n{progress}\n{app}\n</script>')
(root/'preview.html').write_text(html)

print(len(html))
