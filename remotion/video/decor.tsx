import { AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';
import { getDecor, screenMatrix } from '../../config/decors';
import type { VideoProps } from '../props';

/** Same calibrated photograph and projection in the interactive player and Lambda export. */
export function DecorVideo({ props }: { props: VideoProps }) {
  const { width, height } = useVideoConfig();
  const recording = props.graph.recording!;
  const decor = getDecor(recording.decorId);
  if (!decor) throw new Error('Unknown decor');
  const scale = Math.min(width / decor.width, height / decor.height);
  return <AbsoluteFill style={{ background: '#09080c', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: decor.width, height: decor.height, left: (width-decor.width*scale)/2, top: (height-decor.height*scale)/2, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
      <div style={{ position: 'absolute', width: 1000, height: 1000/decor.screenRatio, background: '#09080c', transformOrigin: '0 0', transform: `matrix3d(${screenMatrix(decor.corners, 1000, 1000/decor.screenRatio).join(',')})`, overflow: 'hidden' }}>
        <OffthreadVideo src={recording.src} muted={!recording.originalAudio} style={{ width: '100%', height: '100%', objectFit: recording.decorFit ?? 'contain' }} />
      </div>
      <Img src={staticFile(decor.image.slice(1))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
    </div>
    {props.watermark && <div style={{ position: 'absolute', right: width*.025, bottom: height*.025, padding: '8px 16px', borderRadius: 20, background: 'rgba(0,0,0,.65)', color: '#fff', fontFamily: 'sans-serif', fontSize: Math.min(width,height)*.022 }}>Made with Kinetik</div>}
  </AbsoluteFill>;
}
