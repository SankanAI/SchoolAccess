import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import  PrincipalRegistrationForm from "@/app/page"
import { useRouter } from 'next/navigation';

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Create a proper mock for useRouter
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();

mockUseRouter.mockReturnValue({
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
});

// Mock the fetch API
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('PrincipalRegistrationForm', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
    mockPush.mockClear();
  });

  test('renders the component and switches tabs', () => {
    render(<PrincipalRegistrationForm />);

    // Check if initial tab is Principal Details
    expect(screen.getByText('Principal Details')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();

    // Click to switch to School Details tab
    fireEvent.click(screen.getByRole('tab', { name: 'School Details' }));

    // Check if School Details tab content is visible
    expect(screen.getByText('School Details')).toBeInTheDocument();
    expect(screen.getByLabelText('School Name')).toBeInTheDocument();
  });

  test('validates required fields on submit', async () => {
    render(<PrincipalRegistrationForm />);

    // Attempt to submit without filling fields
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    // Check for validation errors for Principal Details
    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    // Switch to School Details and check for validation errors
    fireEvent.click(screen.getByRole('tab', { name: 'School Details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByText('School name is required')).toBeInTheDocument();
      expect(screen.getByText('School ID is required')).toBeInTheDocument();
    });
  });

  test('validates email and phone formats', async () => {
    render(<PrincipalRegistrationForm />);

    // Fill with invalid email and phone
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
    });
  });

  test('validates password complexity', async () => {
    render(<PrincipalRegistrationForm />);

    // Fill with weak password
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character')).toBeInTheDocument();
    });
  });

  test('successful form submission redirects to login', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Registration successful' }),
    } as Response);

    render(<PrincipalRegistrationForm />);

    // Fill out Principal Details
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john.doe@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secure123!' } });

    // Switch to School Details and fill
    fireEvent.click(screen.getByRole('tab', { name: 'School Details' }));
    fireEvent.change(screen.getByLabelText('School Name'), { target: { value: 'Example High School' } });
    fireEvent.change(screen.getByLabelText('School ID'), { target: { value: 'EXHS123' } });
    fireEvent.change(screen.getByLabelText('School Address'), { target: { value: '123 School St' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    // Wait for the fetch call and redirection
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/register/principal',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: 'John Doe',
            email: 'john.doe@example.com',
            phoneNumber: '123-456-7890',
            password: 'Secure123!',
            schoolName: 'Example High School',
            schoolId: 'EXHS123',
            schoolAddress: '123 School St',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/Principal/login');
    });
  });

  test('handles errors during form submission', async () => {
    const errorMessage = 'Failed to register';
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: errorMessage }),
    } as Response);

    render(<PrincipalRegistrationForm />);

    // Fill out all required fields (simplified for error testing)
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john.doe@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secure123!' } });

    fireEvent.click(screen.getByRole('tab', { name: 'School Details' }));
    fireEvent.change(screen.getByLabelText('School Name'), { target: { value: 'Example High School' } });
    fireEvent.change(screen.getByLabelText('School ID'), { target: { value: 'EXHS123' } });
    fireEvent.change(screen.getByLabelText('School Address'), { target: { value: '123 School St' } });

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(`Registration failed: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  test('shows loading state on submit button', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Registration successful' }),
    } as Response);

    render(<PrincipalRegistrationForm />);

    // Fill out all required fields (simplified)
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john.doe@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Secure123!' } });

    fireEvent.click(screen.getByRole('tab', { name: 'School Details' }));
    fireEvent.change(screen.getByLabelText('School Name'), { target: { value: 'Example High School' } });
    fireEvent.change(screen.getByLabelText('School ID'), { target: { value: 'EXHS123' } });
    fireEvent.change(screen.getByLabelText('School Address'), { target: { value: '123 School St' } });

    // Click the submit button
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    // Check for loading state immediately after click
    expect(screen.getByRole('button', { name: /Register/ })).toBeDisabled();
    expect(screen.getByText('Registering...')).toBeInTheDocument();

    // Wait for the fetch to complete and check if button is enabled again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Register' })).toBeEnabled();
    });
  });
});