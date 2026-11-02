import urllib.request,urllib.parse,json,concurrent.futures
from pathlib import Path
root=Path('output/premiere-2026-11-01')
def find(era):
 params={'action':'query','format':'json','generator':'search','gsrsearch':f'Taylor Swift {era} Eras','gsrnamespace':6,'gsrlimit':12,'prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':500}
 req=urllib.request.Request('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params),headers={'User-Agent':'TheErasEscapeUniversityProject/1.0 (asset attribution research)'})
 data=json.load(urllib.request.urlopen(req,timeout=40))
 pages=list(data.get('query',{}).get('pages',{}).values())
 results=[]
 for page in pages:
  i=page.get('imageinfo',[{}])[0];meta=i.get('extmetadata',{})
  if not i: continue
  results.append({'title':page['title'],'width':i.get('width'),'height':i.get('height'),'url':i.get('url'),'thumb':i.get('thumburl'),'page':i.get('descriptionurl'),'artist':meta.get('Artist',{}).get('value'),'license':meta.get('LicenseShortName',{}).get('value'),'licenseUrl':meta.get('LicenseUrl',{}).get('value')})
 return era,results
allresults=json.loads(root.joinpath('candidates.json').read_text(encoding='utf-8'))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for era,items in pool.map(find,['Fearless','Lover','Folklore']):
  allresults[era]=items
  print(era,json.dumps([{'title':i['title'],'size':[i['width'],i['height']],'license':i['license']} for i in items],ensure_ascii=False))
root.joinpath('candidates.json').write_text(json.dumps(allresults,ensure_ascii=False,indent=2),encoding='utf-8')

selected={}
for era,items in allresults.items():
 portraits=[i for i in items if i['height']>i['width'] and i['license'] in ['CC BY 2.0','CC BY-SA 4.0','CC BY-SA 3.0']]
 for index,item in enumerate(portraits[:2]):
  try:
   req=urllib.request.Request(item['thumb'],headers={'User-Agent':'TheErasEscapeUniversityProject/1.0'})
   content=urllib.request.urlopen(req,timeout=40).read()
   filename=f"{era.lower()}-{index}.jpg"
   root.joinpath(filename).write_bytes(content)
   selected[filename]=item
   print('downloaded',filename,len(content))
  except Exception as e: print('download failed',era,str(e))
root.joinpath('selected-candidates.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
