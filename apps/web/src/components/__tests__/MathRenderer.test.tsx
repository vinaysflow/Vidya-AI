import { render, waitFor } from '@testing-library/react';
import { MathRenderer } from '../MathRenderer';

const waitForKatex = async (container: HTMLElement) => {
  await waitFor(() => {
    expect(container.querySelector('.katex')).not.toBeNull();
  });
};

describe('MathRenderer', () => {
  it('renders basic algebra', async () => {
    const { container } = render(<MathRenderer content={'$x^2 + 5x + 6 = 0$'} />);
    await waitForKatex(container);
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('renders fractions', async () => {
    const { container } = render(<MathRenderer content={'$\\frac{a}{b}$'} />);
    await waitForKatex(container);
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('renders integrals', async () => {
    const { container } = render(
      <MathRenderer content={'$\\int_0^{\\infty} e^{-x^2} dx$'} />
    );
    await waitForKatex(container);
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('renders vectors with custom macro', async () => {
    const { container } = render(<MathRenderer content={'$\\vec{F} = m\\vec{a}$'} />);
    await waitForKatex(container);
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('renders greek letters', async () => {
    const { container } = render(<MathRenderer content={'$\\alpha, \\beta, \\gamma$'} />);
    await waitForKatex(container);
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('renders matrix in display mode', async () => {
    const { container } = render(
      <MathRenderer content={'$$\\begin{bmatrix}1 & 2\\\\3 & 4\\end{bmatrix}$$'} />
    );
    await waitFor(() => {
      expect(container.querySelector('.katex-display')).not.toBeNull();
    });
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('renders chemical equations with mhchem', async () => {
    const { container } = render(<MathRenderer content={'$\\ce{H2O}$'} />);
    await waitForKatex(container);
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('renders multi-line aligned equations', async () => {
    const { container } = render(
      <MathRenderer content={'$$\\begin{aligned}a&=b+c\\\\d&=e+f\\end{aligned}$$'} />
    );
    await waitFor(() => {
      expect(container.querySelector('.katex-display')).not.toBeNull();
    });
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('supports \\( \\) and \\[ \\] delimiters', async () => {
    const { container } = render(
      <MathRenderer content={'Inline: \\(x+1\\) and display: \\[x^2\\]'} />
    );
    await waitFor(() => {
      expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2);
    });
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('shows error message for invalid LaTeX', async () => {
    const { container, getByText } = render(<MathRenderer content={'$\\badcommand$'} />);
    await waitFor(() => {
      expect(container.querySelector('.text-red-600')).not.toBeNull();
    });
    expect(getByText(/Failed to render math|ParseError|KaTeX/i)).toBeTruthy();
  });

  it('re-renders when content changes', async () => {
    const { container, rerender } = render(<MathRenderer content={'$x$'} />);
    await waitForKatex(container);
    expect(container.textContent).toContain('x');

    rerender(<MathRenderer content={'$y$'} />);
    await waitForKatex(container);
    expect(container.textContent).toContain('y');
    expect(container.textContent).not.toContain('x');
  });

  it('handles empty content gracefully', () => {
    const { container } = render(<MathRenderer content={''} />);
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.querySelector('.text-red-600')).toBeNull();
  });
});
