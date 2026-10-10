import sharp from 'sharp';

export async function makeSocialImage(input:Uint8Array) {
 if(input.byteLength>50*1024*1024)throw new Error('画像は50MB以内にしてください。');
 // Keep the full photograph, remove EXIF/GPS, honor orientation, flatten transparency.
 return sharp(input,{limitInputPixels:80_000_000,failOn:'error'}).rotate()
  .resize(1080,1350,{fit:'contain',background:'#f4f3ef'})
  .flatten({background:'#f4f3ef'}).jpeg({quality:88,mozjpeg:true}).toBuffer();
}
