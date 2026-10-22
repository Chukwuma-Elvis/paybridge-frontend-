import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Shell } from '../src/components/layout/Shell';

describe('App Shell Smoke Test', () => {
  it('renders TopBar, navigation, and log dock shell cleanly', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Shell />
      </MemoryRouter>
    );

    expect(screen.getByText('PayBridge Console')).toBeInTheDocument();
    expect(screen.getByText('Guided Demo')).toBeInTheDocument();
    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Sidebar Navigation' })).toBeInTheDocument();
  });
});
