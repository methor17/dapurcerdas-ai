from playwright.sync_api import sync_playwright
from pathlib import Path
import os
root=Path(__file__).parents[1]
shot=root/'screenshots'
shot.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROME_PATH') or None,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1460,'height':930},device_scale_factor=1)
 exceptions=[]
 page.on('pageerror',lambda err:exceptions.append(str(err)))
 page.goto((root/'preview.html').as_uri(),wait_until='networkidle')
 page.locator('[data-page="belanja"]').first.click()
 assert page.locator('#shoppingMenus').inner_text()=='0'
 assert page.locator('#shoppingTotal').inner_text()=='0'
 # schedule only recommendations, no shopping
 page.locator('[data-page="mingguan"]').first.click()
 page.locator('#offlinePlanBtn').click()
 assert page.locator('.day-recipe').count()==14
 assert page.locator('.day-recipe [data-find-plan-ingredients]').count()==14
 page.locator('[data-page="belanja"]').first.click()
 assert page.locator('#shoppingMenus').inner_text()=='0', 'weekly plan must not auto-shop'
 assert page.locator('#shoppingTotal').inner_text()=='0'
 # favorite must not create a shopping list
 page.locator('[data-page="rekomendasi"]').first.click()
 page.locator('.recipe-card [data-favorite]').first.click()
 page.locator('[data-page="belanja"]').first.click()
 assert page.locator('#shoppingMenus').inner_text()=='0', 'favorite must not auto-shop'
 # choose a plan slot; shopping additions only when explicitly selected
 page.locator('[data-page="mingguan"]').first.click()
 page.locator('.day-recipe [data-find-plan-ingredients]').first.click()
 assert page.locator('#shoppingMenus').inner_text()=='1'
 assert page.locator('#selectedRecipeChips .selected-pill').count()==1
 assert page.locator('#shoppingList').inner_text(), 'shopping list content expected from selected recipe'
 page.screenshot(path=str(shot/'v5-03-belanja-pilihan.png'),full_page=True)
 page.locator('#selectedRecipeChips [data-remove-plan-selected]').first.click()
 assert page.locator('#shoppingMenus').inner_text()=='0'
 assert page.locator('#shoppingTotal').inner_text()=='0'
 # select whole week, and then cancel
 page.locator('[data-page="mingguan"]').first.click()
 page.locator('#selectWholeWeekBtn').click()
 assert page.locator('#shoppingMenus').inner_text()=='14'
 assert page.locator('#selectedRecipeChips .selected-pill').count()==14
 page.screenshot(path=str(shot/'v5-02-belanja-7-hari-terpilih.png'),full_page=True)
 page.locator('[data-page="mingguan"]').first.click()
 page.screenshot(path=str(shot/'v5-01-menu-7-hari.png'),full_page=True)
 page.locator('#unselectWholeWeekBtn').click()
 assert page.locator('#shoppingMenus').inner_text()=='0'
 # From searched recipes, add explicitly
 page.locator('[data-page="mau-masak"]').first.click()
 page.locator('#cookQuery').fill('ayam kecap')
 assert page.locator('#cookResults .recipe-card').count()>=1
 page.locator('#cookResults .recipe-card [data-find-ingredients]').first.click()
 assert page.locator('#shoppingMenus').inner_text()=='1'
 # steps and ingredients in detail
 page.locator('[data-page="mau-masak"]').first.click()
 page.locator('#cookResults .recipe-card [data-view]').first.click()
 assert page.locator('#modalContent .cooking-steps li').count()>=3
 assert page.locator('#modalContent .ingredient-group').count()==4
 page.locator('#modalContent .cooking-steps input[type="checkbox"]').first.check()
 assert page.locator('#modalContent .cooking-steps input[type="checkbox"]').first.is_checked()
 page.locator('#modalClose').click()
 # Chat demo event binding
 page.locator('[data-page="asisten"]').first.click()
 page.locator('#chatInput').fill('cara memasak ayam kecap')
 page.locator('#sendChatBtn').click()
 assert page.locator('#chatMessages .chat-bubble').count()==2, 'chat demo must respond'
 assert 'Mode demo lokal' in page.locator('#chatMessages').inner_text()
 page.screenshot(path=str(shot/'v5-04-chat-koki.png'),full_page=True)
 # Google no ID must show obvious fallback
 page.locator('[data-page="rekomendasi"]').first.click()
 page.locator('#googleQuery').fill('resep nasi goreng Jawa')
 page.locator('#googleSearchBtn').click()
 assert page.locator('.google-fallback a').count()==1
 page.screenshot(path=str(shot/'v5-05-inspirasi-google.png'),full_page=True)
 # ensure local saving across reload
 page.reload(wait_until='networkidle')
 page.locator('[data-page="belanja"]').first.click()
 assert page.locator('#shoppingMenus').inner_text()=='1'
 # desktop screenshot of home
 page.locator('[data-page="beranda"]').first.click()
 page.screenshot(path=str(shot/'v5-00-beranda.png'),full_page=True)
 assert not exceptions, 'browser JavaScript errors: '+str(exceptions)
 # mobile responsive
 phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 mobile_err=[];phone.on('pageerror',lambda err:mobile_err.append(str(err)))
 phone.goto((root/'preview.html').as_uri(),wait_until='networkidle')
 phone.screenshot(path=str(shot/'v5-06-mobile.png'),full_page=True)
 scroll=phone.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
 assert not scroll, 'horizontal overflow on mobile'
 assert not mobile_err, 'mobile JS errors: '+str(mobile_err)
 print('PASS V5: empty shopping, weekly suggestions isolated, favorites isolated, individual plan selection, all-week selection, deselect, search selection, steps, chat demo, Google fallback, persistence, mobile')
 browser.close()
