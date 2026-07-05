export interface CameraViewModel {
  enableRotate: boolean;
  enableTranslate: boolean;
  enableZoom: boolean;
  enableTilt: boolean;
  enableLook: boolean;
  minimumZoomDistance: number;
  maximumZoomDistance: number;
  inertiaSpin: number;
  inertiaTranslate: number;
  inertiaZoom: number;
}
