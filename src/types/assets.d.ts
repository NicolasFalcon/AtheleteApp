// Sound files bundled by Metro (src/assets/sounds): `require` gives the asset id.
declare module '*.wav' {
  const asset: number;
  export default asset;
}

declare module '*.caf' {
  const asset: number;
  export default asset;
}
