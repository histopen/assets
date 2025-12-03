export default {
  multipass: true,
  js2svg: { pretty: false },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // keep the viewBox
          removeViewBox: false,
          // remove width/height so icons are scalable
          removeDimensions: true
        }
      }
    }
  ]
};
