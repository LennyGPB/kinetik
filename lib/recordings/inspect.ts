import { RECORDING_MAX_BYTES, RECORDING_MAX_SECONDS } from "./model";

/** ISO BMFF metadata, checked without executing a decoder. Accept only H.264 MP4/MOV. */
export function inspectRecording(data: Buffer) {
  if (data.length > RECORDING_MAX_BYTES || data.length < 32 || data.toString("ascii", 4, 8) !== "ftyp") throw new Error("invalid_video");
  function boxes(start: number, end: number) {
    const result: { type: string; start: number; end: number }[] = [];
    for (let offset = start; offset + 8 <= end;) {
      let size = data.readUInt32BE(offset), header = 8;
      if (size === 1) {
        if (offset + 16 > end) throw new Error("invalid_video");
        const large = data.readBigUInt64BE(offset + 8);
        if (large > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("invalid_video");
        size = Number(large); header = 16;
      } else if (size === 0) size = end - offset;
      if (size < header || offset + size > end) throw new Error("invalid_video");
      result.push({ type: data.toString("ascii", offset + 4, offset + 8), start: offset + header, end: offset + size });
      offset += size;
      if (result.length > 10000) throw new Error("invalid_video");
    }
    return result;
  }
  const movie = boxes(0, data.length).find((box) => box.type === "moov");
  if (!movie) throw new Error("invalid_video");
  const children = boxes(movie.start, movie.end);
  const header = children.find((box) => box.type === "mvhd");
  if (!header || header.end - header.start < 32) throw new Error("invalid_video");
  const v1 = data[header.start] === 1;
  const timescale = data.readUInt32BE(header.start + (v1 ? 20 : 12));
  const ticks = v1 ? Number(data.readBigUInt64BE(header.start + 24)) : data.readUInt32BE(header.start + 16);
  const duration = Math.floor(ticks / timescale * 30) / 30;
  if (!Number.isFinite(duration) || duration < 1 || duration > RECORDING_MAX_SECONDS) throw new Error("duration");
  for (const track of children.filter((box) => box.type === "trak")) {
    const parts = boxes(track.start, track.end);
    const mdia = parts.find((box) => box.type === "mdia");
    const tkhd = parts.find((box) => box.type === "tkhd");
    if (!mdia || !tkhd) continue;
    if (tkhd.end - tkhd.start < (data[tkhd.start] === 1 ? 96 : 84)) throw new Error("invalid_video");
    const media = boxes(mdia.start, mdia.end);
    const hdlr = media.find((box) => box.type === "hdlr");
    if (!hdlr || hdlr.end - hdlr.start < 12 || data.toString("ascii", hdlr.start + 8, hdlr.start + 12) !== "vide") continue;
    const minf = media.find((box) => box.type === "minf");
    const stbl = minf && boxes(minf.start, minf.end).find((box) => box.type === "stbl");
    const stsd = stbl && boxes(stbl.start, stbl.end).find((box) => box.type === "stsd");
    if (!stsd || stsd.end - stsd.start < 16) throw new Error("invalid_video");
    const codec = data.toString("ascii", stsd.start + 12, stsd.start + 16);
    if (codec !== "avc1" && codec !== "avc3") throw new Error("unsupported_codec");
    const width = Math.round(data.readUInt32BE(tkhd.end - 8) / 65536);
    const height = Math.round(data.readUInt32BE(tkhd.end - 4) / 65536);
    if (width < 16 || height < 16 || width > 7680 || height > 7680) throw new Error("invalid_video");
    return { duration, width, height };
  }
  throw new Error("invalid_video");
}
