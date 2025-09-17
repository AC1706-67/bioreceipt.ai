/**
 * Unit tests for SignInScreen component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SignInScreen } from '../../src/screens/auth/SignInScreen';
import authReducer from '../../src/store/authSlice';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => fn,
    formState: { errors: {} },
    reset: jest.fn(),
  }),
  Controller: ({ render }: any) =>
    render({
      field: {
        onChange: jest.fn(),
        onBlur: jest.fn(),
        value: '',
      },
    }),
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
};

const renderWithProvider = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(<Provider store={store}>{component}</Provider>);
};

describe('SignInScreen', () => {
  const mockProps = {
    onNavigateToSignUp: jest.fn(),
    onSignInSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<SignInScreen {...mockProps} />);

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to continue your wellness journey')).toBeTruthy();
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('Phone')).toBeTruthy();
  });

  it('should show email input by default', () => {
    const { getByPlaceholderText } = renderWithProvider(
      <SignInScreen {...mockProps} />,
    );

    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
  });

  it('should switch to phone input when phone tab is pressed', () => {
    const { getByText, getByPlaceholderText } = renderWithProvider(
      <SignInScreen {...mockProps} />,
    );

    const phoneTab = getByText('Phone');
    fireEvent.press(phoneTab);

    expect(getByPlaceholderText('Enter your phone number')).toBeTruthy();
  });

  it('should show sign up link', () => {
    const { getByText } = renderWithProvider(<SignInScreen {...mockProps} />);

    const signUpLink = getByText('Sign Up');
    expect(signUpLink).toBeTruthy();

    fireEvent.press(signUpLink);
    expect(mockProps.onNavigateToSignUp).toHaveBeenCalled();
  });

  it('should show OAuth buttons', () => {
    const { getByText } = renderWithProvider(<SignInScreen {...mockProps} />);

    expect(getByText('Continue with Google')).toBeTruthy();
  });

  it('should show Apple Sign-In on iOS', () => {
    // Mock Platform.OS
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      OS: 'ios',
    }));

    const { getByText } = renderWithProvider(<SignInScreen {...mockProps} />);
    expect(getByText('Continue with Apple')).toBeTruthy();
  });
});
