// Reduce fotos antes de guardarlas: JPEG, lado mayor de 2000 px como mucho y peso máximo.
const LADO = 2000;

const aBlob = (c, calidad) => new Promise(ok => c.toBlob(ok, 'image/jpeg', calidad));

export async function reducirFoto(blob, maxBytes = 300 * 1024) {
  const img = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  let k = Math.min(1, LADO / Math.max(img.width, img.height));
  for (;;) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    for (const calidad of [0.85, 0.75, 0.65, 0.55, 0.45]) {
      const r = await aBlob(c, calidad);
      if (r.size <= maxBytes) return r;
    }
    if (c.width <= 400 && c.height <= 400) return aBlob(c, 0.4);
    k *= 0.75;
  }
}
