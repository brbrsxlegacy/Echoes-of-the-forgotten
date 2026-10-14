"""Convert the two original region sheets to aligned, transparent shipping atlases."""
from pathlib import Path
from PIL import Image
import json
ROOT=Path(__file__).resolve().parents[1]
S=ROOT.parent/'generated_images'
for region,bg,sheet in [
 ('drowned','exec-b7d65a33-d13a-43bd-b31c-ae7743d65765.png','exec-546a6bf5-db14-41cf-ad33-916f7f190273.png'),
 ('ashen','exec-2faaa3b5-4b5b-41cd-9f22-17dc43d52ea3.png','exec-7cc22e02-6194-4854-803f-922bfd484516.png')]:
 Image.open(S/bg).convert('RGB').save(ROOT/f'public/assets/environments/{region}.webp','WEBP',quality=90,method=6)
 im=Image.open(S/sheet).convert('RGBA');out=Image.new('RGBA',(1536,1280));frames=[]
 for row in range(5):
  for col in range(6):
   piece=im.crop((round(col*im.width/6)+3,round(row*im.height/5)+3,round((col+1)*im.width/6)-3,round((row+1)*im.height/5)-3))
   box=piece.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
   if not box:raise ValueError(f'Empty {region} cell {row},{col}')
   piece=piece.crop(box);scale=min(240/piece.width,238/piece.height)
   piece=piece.resize((round(piece.width*scale),round(piece.height*scale)),Image.Resampling.LANCZOS)
   x=col*256+(256-piece.width)//2;y=row*256+248-piece.height
   out.alpha_composite(piece,(x,y));frames.append([x,y,piece.width,piece.height])
 out.save(ROOT/f'public/assets/environments/{region}-atlas.webp','WEBP',quality=92,method=6)
 (ROOT/f'public/assets/environments/{region}-frames.json').write_text(json.dumps(frames))
 print(region, '30 aligned frames', len(frames), 'background + atlas encoded')
