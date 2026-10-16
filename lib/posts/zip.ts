/** Small uncompressed ZIP writer; PNG/JPEG are already compressed. UTF-8 names, bounded to five images. */
export function imageZip(files: { name: string; data: Buffer }[]) {
  if (files.length < 1 || files.length > 5) throw new Error("invalid_archive");
  const parts: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    let crc = 0xffffffff;
    for (const byte of file.data) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(file.data.length, 18); local.writeUInt32LE(file.data.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(file.data.length, 20); central.writeUInt32LE(file.data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    parts.push(local, name, file.data); directory.push(central, name);
    offset += local.length + name.length + file.data.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.reduce((size, part) => size + part.length, 0), 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...directory, end]);
}
