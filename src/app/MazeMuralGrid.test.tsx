// @jest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import MazeMuralGrid from './MazeMuralGrid';

describe('MazeMuralGrid', () => {
  it('renders the correct number of cells', () => {
    render(<MazeMuralGrid />);
    // 2x2 grid = 4 cells
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBe(4);
  });
}); 