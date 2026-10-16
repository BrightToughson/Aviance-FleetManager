import 'react-native';

declare module 'react-native' {
  interface TextInputProps {
    outlineStyle?: string;
  }
  interface TextStyle {
    outlineStyle?: string;
  }
  interface ViewStyle {
    outlineStyle?: string;
  }
}
