import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render input with search icon', () => {
    render(<SearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole('searchbox', { name: /search visitors/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search visitors...');
  });

  it('should render custom placeholder', () => {
    render(
      <SearchInput
        value=""
        onChange={mockOnChange}
        placeholder="Search by name..."
      />
    );

    const input = screen.getByPlaceholderText('Search by name...');
    expect(input).toBeInTheDocument();
  });

  it('should call onChange when typing', () => {
    render(<SearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'John' } });

    expect(mockOnChange).toHaveBeenCalledWith('John');
  });

  it('should show clear button when value is not empty', () => {
    render(<SearchInput value="test" onChange={mockOnChange} />);

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('should not show clear button when value is empty', () => {
    render(<SearchInput value="" onChange={mockOnChange} />);

    const clearButton = screen.queryByRole('button', { name: /clear search/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  it('should clear input and focus when clear button is clicked', () => {
    render(<SearchInput value="test query" onChange={mockOnChange} />);

    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
    
    const input = screen.getByRole('searchbox');
    expect(input).toHaveFocus();
  });

  it('should disable input when disabled prop is true', () => {
    render(<SearchInput value="" onChange={mockOnChange} disabled={true} />);

    const input = screen.getByRole('searchbox');
    expect(input).toBeDisabled();
  });

  it('should hide clear button when disabled', () => {
    render(<SearchInput value="test" onChange={mockOnChange} disabled={true} />);

    const clearButton = screen.queryByRole('button', { name: /clear search/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<SearchInput value="test" onChange={mockOnChange} />);

    const container = screen.getByTestId('search-input-container');
    expect(container).toHaveAttribute('role', 'search');

    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('aria-label', 'Search visitors');
    expect(input).toHaveAttribute('aria-describedby', 'search-clear-button');
  });

  it('should not have aria-describedby when value is empty', () => {
    render(<SearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole('searchbox');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('should apply custom className', () => {
    render(<SearchInput value="" onChange={mockOnChange} className="custom-class" />);

    const container = screen.getByTestId('search-input-container');
    expect(container).toHaveClass('custom-class');
  });
});
