// OpenCV.js is loaded as a UMD script and exposes `cv` on the global scope.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const cv: any;
// Namespace merge so `cv.Mat` etc. are valid as type annotations.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace cv {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Mat = any;
}

interface Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cv: any;
}
