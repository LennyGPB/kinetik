import { Color, type Texture } from "three";

const vertex = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;

/** Optical displacement of the supplied photo, never a reconstruction of its label or sides. */
/** `boost` (0 → 1) : au pic d'une transition, la réfraction culmine et « dissout » le produit d'un plan à l'autre. */
export function FlutedProduct({ texture, width, height, opacity, time, boost = 0 }: { texture: Texture; width: number; height: number; opacity: number; time: number; boost?: number }) {
  const strength = .48 + .44 * Math.sin(time * 1.35) + boost * .55;
  return <mesh>
    <planeGeometry args={[width * 1.6, height * 1.18]} />
    <shaderMaterial transparent depthWrite={opacity > .99} toneMapped={false}
      uniforms={{ photo: { value: texture }, amount: { value: strength }, clock: { value: time }, alpha: { value: opacity } }}
      vertexShader={vertex} fragmentShader={`
        uniform sampler2D photo; uniform float amount,clock,alpha; varying vec2 vUv;
        void main(){
          vec2 p=(vUv-.5)*vec2(1.6,1.18)+.5;
          float flute=sin((vUv.x*18.0+clock*.1)*6.283185);
          float ridge=cos((vUv.x*18.0+clock*.1)*6.283185);
          p.x+=flute*.075*amount;
          p.y=.5+(p.y-.5)*(1.0+ridge*.31*amount)+flute*.045*amount;
          if(p.x<0.0||p.x>1.0||p.y<0.0||p.y>1.0) discard;
          vec4 c=texture2D(photo,p);
          c.rgb*=1.0+ridge*.10*amount;
          gl_FragColor=vec4(c.rgb,c.a*alpha);
          #include <colorspace_fragment>
        }`} />
  </mesh>;
}

export function FlutedGlassEnvironment({ base, accent, time }: { base: string; accent: string; time: number }) {
  return <>
    <color attach="background" args={[base]} />
    <mesh position={[0, 3, -8]}>
      <planeGeometry args={[36, 28]} />
      <shaderMaterial toneMapped={false} uniforms={{ base: { value: new Color(base) }, light: { value: new Color(accent) }, clock: { value: time } }} vertexShader={vertex}
        fragmentShader={`uniform vec3 base,light;uniform float clock;varying vec2 vUv;
          void main(){
            float phase=vUv.x*115.0+sin(vUv.y*3.0+clock*.12)*.10+clock*.025;
            float flute=.5+.5*cos(phase*6.283185);
            float line=pow(flute,12.0);
            float glow=exp(-pow((vUv.x-.58)*2.6,2.0));
            vec3 color=mix(base*.68,light,.14+glow*.25+flute*.13+line*.20);
            gl_FragColor=vec4(color,1.0);
            #include <colorspace_fragment>
          }`} />
    </mesh>
  </>;
}
