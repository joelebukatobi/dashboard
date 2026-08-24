// Re-exports only the CKEditor5 bindings new.js/edit.js actually use, so
// esbuild's tree-shaking drops the other ~55 sub-packages from the bundle.
// If you add a plugin to the editor config in new.js/edit.js, add its name
// here too, or it'll be undefined at runtime.
export {
  ClassicEditor,
  Essentials,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  List,
  Link,
  SourceEditing,
  Paragraph,
  BlockQuote,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUpload,
  SimpleUploadAdapter,
  Alignment,
  SpecialCharacters,
  MediaEmbed,
  Code,
  Plugin,
  ButtonView,
} from 'ckeditor5';
