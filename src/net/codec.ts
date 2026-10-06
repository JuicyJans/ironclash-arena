/** Little-endian binary writer/reader used by the network protocol. */
export class ByteWriter {
  private buf: ArrayBuffer;
  private view: DataView;
  private pos = 0;

  constructor(capacity = 512) {
    this.buf = new ArrayBuffer(capacity);
    this.view = new DataView(this.buf);
  }

  private ensure(n: number): void {
    if (this.pos + n <= this.buf.byteLength) return;
    let size = this.buf.byteLength * 2;
    while (size < this.pos + n) size *= 2;
    const next = new ArrayBuffer(size);
    new Uint8Array(next).set(new Uint8Array(this.buf));
    this.buf = next;
    this.view = new DataView(next);
  }

  u8(v: number): this {
    this.ensure(1);
    this.view.setUint8(this.pos, clampInt(v, 0, 255));
    this.pos += 1;
    return this;
  }

  i8(v: number): this {
    this.ensure(1);
    this.view.setInt8(this.pos, clampInt(v, -128, 127));
    this.pos += 1;
    return this;
  }

  u16(v: number): this {
    this.ensure(2);
    this.view.setUint16(this.pos, clampInt(v, 0, 65535), true);
    this.pos += 2;
    return this;
  }

  i16(v: number): this {
    this.ensure(2);
    this.view.setInt16(this.pos, clampInt(v, -32768, 32767), true);
    this.pos += 2;
    return this;
  }

  u32(v: number): this {
    this.ensure(4);
    this.view.setUint32(this.pos, Math.max(0, Math.round(v)) >>> 0, true);
    this.pos += 4;
    return this;
  }

  f32(v: number): this {
    this.ensure(4);
    this.view.setFloat32(this.pos, v, true);
    this.pos += 4;
    return this;
  }

  f64(v: number): this {
    this.ensure(8);
    this.view.setFloat64(this.pos, v, true);
    this.pos += 8;
    return this;
  }

  str(s: string): this {
    const bytes = new TextEncoder().encode(s);
    this.u32(bytes.length);
    this.ensure(bytes.length);
    new Uint8Array(this.buf, this.pos, bytes.length).set(bytes);
    this.pos += bytes.length;
    return this;
  }

  bytes(): Uint8Array {
    return new Uint8Array(this.buf.slice(0, this.pos));
  }
}

export class ByteReader {
  private view: DataView;
  private pos = 0;

  constructor(private data: Uint8Array) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get remaining(): number {
    return this.data.byteLength - this.pos;
  }

  private need(n: number): void {
    if (this.pos + n > this.data.byteLength) throw new RangeError('Truncated network message');
  }

  u8(): number {
    this.need(1);
    return this.view.getUint8(this.pos++);
  }

  i8(): number {
    this.need(1);
    return this.view.getInt8(this.pos++);
  }

  u16(): number {
    this.need(2);
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }

  i16(): number {
    this.need(2);
    const v = this.view.getInt16(this.pos, true);
    this.pos += 2;
    return v;
  }

  u32(): number {
    this.need(4);
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }

  f32(): number {
    this.need(4);
    const v = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return v;
  }

  f64(): number {
    this.need(8);
    const v = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return v;
  }

  str(): string {
    const len = this.u32();
    this.need(len);
    const s = new TextDecoder().decode(this.data.subarray(this.pos, this.pos + len));
    this.pos += len;
    return s;
  }
}

function clampInt(v: number, min: number, max: number): number {
  const r = Math.round(v);
  return r < min ? min : r > max ? max : r;
}
