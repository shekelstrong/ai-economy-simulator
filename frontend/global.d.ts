/// <reference types="react" />
/// <reference types="react-dom" />

declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}
