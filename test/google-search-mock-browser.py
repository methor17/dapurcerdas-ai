from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'preview.html').read_text()
fake_cse='''
window.google={setOnLoadCallback:(fn)=>fn(),search:{cse:{element:{
 render:(conf)=>{window.__testGoogleEngine={execute:(query)=>{window.__testExecuted=query;window.__gcse.searchCallbacks.web.ready('dc-google',query,[],[{titleNoFormatting:'Ayam Bakar Kecap Enak',url:'https://example.com/ayam-bakar-kecap',contentNoFormatting:'Bahan ayam, bawang, kecap. Cara masak.'}],null)}}},
 getElement:(name)=>window.__testGoogleEngine||null
}}}};
window.__gcse.initializationCallback();
'''
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=b.new_context()
 context.route('**/cse.js?cx=*',lambda route:route.fulfill(status=200,content_type='application/javascript',body=fake_cse))
 page=context.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 print('badge before:',page.locator('#googleBadge').inner_text(), 'errors', errs[:3])
 page.wait_for_timeout(2000)
 print('badge after:',page.locator('#googleBadge').inner_text(), 'errors', errs[:3])
 page.locator('[data-page="rekomendasi"]').first.click()
 page.locator('#googleQuery').fill('ayam kecap')
 page.locator('#googleSearchBtn').click()
 print('status:',page.locator('#googleStatus').inner_text())
 print('results:',page.locator('[data-google-import]').count())
 print('errors:',errs[:4])
 b.close()
