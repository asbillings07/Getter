import { test, expect, chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { cp, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
let server,origin;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64');
test.beforeAll(async()=>{
  server=createServer((req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','*');
    if(req.url==='/image.png'){res.setHeader('Content-Type','image/png');res.end(png);return;}
    if(req.url==='/frame'){res.setHeader('Content-Type','text/html');res.end('<p style="color:rgb(10,20,30)">Frame text</p>');return;}
    res.setHeader('Content-Type','text/html');
    res.end(`<!doctype html><html><head><title>Synthetic Getter fixture</title></head><body style="color:rgb(18,52,86);background:white;font-family:Arial"><h1 id="unchanged" style="font-family:Georgia;font-size:32px">A test page</h1><p>Visible text</p><img alt="Sample image" src="/image.png" width="80" height="80"><iframe src="/frame"></iframe><iframe src="${origin.replace('127.0.0.1','localhost')}/frame"></iframe><iframe sandbox src="/frame"></iframe></body></html>`);
  });
  await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));origin=`http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async()=>{server?.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
async function launch(testInfo){
  const extension=testInfo.outputPath('extension');await mkdir(extension,{recursive:true});await cp('dist',extension,{recursive:true});
  const manifest=JSON.parse(await readFile(path.join(extension,'manifest.json'),'utf8'));
  // Test-only grants let an inactive popup exercise real injection against owned fixtures.
  // The shipping manifest is checked separately and has NO host permissions.
  manifest.host_permissions=['http://127.0.0.1/*','http://localhost/*'];
  await writeFile(path.join(extension,'manifest.json'),JSON.stringify(manifest));
  const context=await chromium.launchPersistentContext(testInfo.outputPath('profile'),{channel:'chromium',headless:true,acceptDownloads:true,downloadsPath:testInfo.outputPath('downloads'),args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  let worker=context.serviceWorkers()[0];if(!worker)worker=await context.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host;
  const page=await context.newPage();await page.goto(origin);await page.bringToFront();await page.waitForLoadState('networkidle');
  const before=await page.locator('html').evaluate(el=>el.outerHTML);
  const openPopup=async()=>{const newPage=context.waitForEvent('page');await worker.evaluate(url=>chrome.tabs.create({url,active:false}),`chrome-extension://${id}/popup.html`);const popup=await newPage;await popup.waitForLoadState();return popup;};
  return {context,worker,page,before,openPopup};
}
test('production UI scans fixtures without altering the page and retains approved branding',async({},info)=>{
  const app=await launch(info);try{
    const popup=await app.openPopup();const errors=[];popup.on('pageerror',error=>errors.push(error.message));
    await expect(popup.getByRole('heading',{name:'Page palette',exact:true})).toBeVisible();
    await expect(popup.getByRole('button',{name:'Copy #123456',exact:true})).toBeVisible();
    await expect(popup.getByText('Created by Aptelum Labs',{exact:true})).toBeVisible();
    expect(await app.page.locator('html').evaluate(el=>el.outerHTML)).toBe(app.before);
    await expect(popup.getByText(/embedded frame\(s\) were not included/)).toBeVisible();
    await popup.getByRole('button',{name:'Fonts',exact:true}).click();await expect(popup.getByText('Georgia',{exact:true})).toBeVisible();
    await popup.getByRole('button',{name:'Settings',exact:true}).click();await popup.getByLabel('Font size',{exact:true}).uncheck();await expect(popup.getByText('Preference saved.',{exact:true})).toBeVisible();
    await popup.close();const reopened=await app.openPopup();await reopened.getByRole('button',{name:'Settings',exact:true}).click();await expect(reopened.getByLabel('Font size',{exact:true})).not.toBeChecked();
    await reopened.getByRole('button',{name:'About Getter',exact:true}).click();await expect(reopened.getByText('Created by Aptelum Labs.',{exact:true})).toBeVisible();await expect(reopened.getByText('Original design by Amanda Billings.',{exact:true})).toBeVisible();
    const stored=await app.worker.evaluate(()=>chrome.storage.local.get(null));expect(Object.keys(stored)).toEqual(['cssGetterOptions']);expect(errors).toEqual([]);
  }finally{await app.context.close();}
});
test('images load only on request; ZIP has a real download outcome',async({},info)=>{
  const app=await launch(info);try{
    const popup=await app.openPopup();await expect(popup.getByRole('heading',{name:'Page palette',exact:true})).toBeVisible();
    await popup.getByRole('button',{name:'Images',exact:true}).click();await expect(popup.getByText('Preview off',{exact:true})).toBeVisible();
    await popup.getByLabel('Load previews',{exact:true}).check();await expect(popup.getByRole('img',{name:'Sample image',exact:true})).toBeVisible();
    await popup.getByRole('button',{name:'Read file size',exact:true}).click();await expect(popup.getByText(/KiB/)).toBeVisible();
    await popup.getByRole('button',{name:'Download ZIP',exact:true}).click();
    const downloadEvent=popup.waitForEvent('download');await popup.getByRole('button',{name:'Prepare ZIP',exact:true}).click();const download=await downloadEvent;
    expect(download.suggestedFilename()).toBe('getter-images.zip');expect(await download.failure()).toBeNull();await expect(popup.getByText('Download completed.',{exact:true})).toBeVisible();
  }finally{await app.context.close();}
});
test('same-URL navigation clears data; a fresh scan does not reuse the old document',async({},info)=>{
  const app=await launch(info);try{const popup=await app.openPopup();await expect(popup.getByRole('heading',{name:'Page palette',exact:true})).toBeVisible();await app.page.reload();await expect(popup.getByRole('heading',{name:'Scan again when ready',exact:true})).toBeVisible();await expect(popup.getByRole('button',{name:'Copy #123456',exact:true})).toHaveCount(0);await popup.getByRole('button',{name:/Scan again/}).click();await expect(popup.getByRole('heading',{name:'Page palette',exact:true})).toBeVisible();}finally{await app.context.close();}
});
