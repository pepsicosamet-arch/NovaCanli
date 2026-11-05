// Yeşil perde (Chroma Key) - WebGL ile GPU üzerinde
class ChromaKeyer {
  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, alpha: true });
    this.gl = gl;
    if (!gl) return;
    const vs = `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2((p.x+1.0)/2.0, 1.0-(p.y+1.0)/2.0); gl_Position=vec4(p,0,1);} `;
    const fs = `precision mediump float; varying vec2 uv; uniform sampler2D t;
      uniform vec3 key; uniform float sim; uniform float smooth_; uniform float spill;
      vec2 rgb2uv(vec3 c){ return vec2(c.r*-0.169+c.g*-0.331+c.b*0.5+0.5, c.r*0.5+c.g*-0.419+c.b*-0.081+0.5); }
      void main(){
        vec4 c = texture2D(t, uv);
        float d = distance(rgb2uv(c.rgb), rgb2uv(key));
        float base = d - sim;
        float a = pow(clamp(base / max(smooth_, 0.0001), 0.0, 1.0), 1.5);
        float sp = pow(clamp(base / max(spill, 0.0001), 0.0, 1.0), 1.5);
        float desat = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 col = mix(vec3(desat), c.rgb, sp);
        gl_FragColor = vec4(col, c.a * a);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.u = { key: gl.getUniformLocation(pr, 'key'), sim: gl.getUniformLocation(pr, 'sim'), smooth: gl.getUniformLocation(pr, 'smooth_'), spill: gl.getUniformLocation(pr, 'spill') };
  }
  // src: video/img/canvas; opts: {color:'#00ff00', similarity, smoothness, spill}
  process(src, w, h, opts) {
    const gl = this.gl; if (!gl || !w || !h) return src;
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { return src; }
    const c = hexToRgb(opts.color || '#00ff00');
    gl.uniform3f(this.u.key, c[0] / 255, c[1] / 255, c[2] / 255);
    gl.uniform1f(this.u.sim, (opts.similarity ?? 40) / 100 * 0.5);
    gl.uniform1f(this.u.smooth, (opts.smoothness ?? 8) / 100 * 0.5);
    gl.uniform1f(this.u.spill, (opts.spill ?? 10) / 100 * 0.5);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.canvas;
  }
}

function hexToRgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
