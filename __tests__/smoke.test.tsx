import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

function Hello() {
  return <Text>hello</Text>;
}

test('renders hello', () => {
  const { getByText } = render(<Hello />);
  expect(getByText('hello')).toBeTruthy();
});
