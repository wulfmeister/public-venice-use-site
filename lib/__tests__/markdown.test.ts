import { describe, it, expect } from 'vitest';
import { formatMessage, escapeHtml } from '../markdown';

describe('escapeHtml', () => {
  it('escapes HTML entities', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toContain('&lt;');
    expect(escapeHtml('<script>alert("xss")</script>')).toContain('&gt;');
    // In jsdom, document.createElement escapes < > & but not " (browser behavior)
    expect(escapeHtml('a&b')).toContain('&amp;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a&b')).toContain('&amp;');
  });
});

describe('formatMessage', () => {
  it('renders plain text', () => {
    const result = formatMessage('Hello world');
    expect(result).toContain('Hello world');
  });

  it('renders bold text', () => {
    const result = formatMessage('This is **bold** text');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('renders italic text', () => {
    const result = formatMessage('This is *italic* text');
    expect(result).toContain('<em>italic</em>');
  });

  it('renders strikethrough', () => {
    const result = formatMessage('This is ~~deleted~~ text');
    expect(result).toContain('<del>deleted</del>');
  });

  it('renders inline code', () => {
    const result = formatMessage('Use `console.log()` here');
    expect(result).toContain('<code class="md-inline-code">console.log()</code>');
  });

  it('renders code blocks', () => {
    const result = formatMessage('```js\nconst x = 1;\n```');
    expect(result).toContain('<pre class="md-codeblock">');
    expect(result).toContain('language-js');
    expect(result).toContain('const x = 1;');
  });

  it('escapes HTML in code blocks', () => {
    const result = formatMessage('```\n<div>test</div>\n```');
    expect(result).toContain('&lt;div&gt;');
  });

  it('renders headers', () => {
    expect(formatMessage('# Title')).toContain('<h1');
    expect(formatMessage('## Subtitle')).toContain('<h2');
    expect(formatMessage('### H3')).toContain('<h3');
  });

  it('renders unordered lists', () => {
    const result = formatMessage('- Item 1\n- Item 2');
    expect(result).toContain('<ul class="md-list">');
    expect(result).toContain('<li>Item 1</li>');
    expect(result).toContain('<li>Item 2</li>');
  });

  it('renders ordered lists', () => {
    const result = formatMessage('1. First\n2. Second');
    expect(result).toContain('<ol class="md-list">');
    expect(result).toContain('<li>First</li>');
  });

  it('renders blockquotes', () => {
    const result = formatMessage('> This is a quote');
    expect(result).toContain('<blockquote class="md-blockquote">');
  });

  it('renders horizontal rules', () => {
    expect(formatMessage('---')).toContain('<hr class="md-hr">');
    expect(formatMessage('***')).toContain('<hr class="md-hr">');
  });

  it('renders links', () => {
    const result = formatMessage('[Click here](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('Click here');
    expect(result).toContain('target="_blank"');
  });

  it('does not render links with invalid URLs', () => {
    const result = formatMessage('[Click](not-a-url)');
    expect(result).not.toContain('href=');
    expect(result).toContain('Click');
  });

  it('renders pipe tables', () => {
    const input = '| Name | Age |\n| --- | --- |\n| Alice | 30 |';
    const result = formatMessage(input);
    expect(result).toContain('<table class="md-table">');
    expect(result).toContain('<th');
    expect(result).toContain('Name');
    expect(result).toContain('<td');
    expect(result).toContain('Alice');
  });

  it('escapes HTML entities in content', () => {
    const result = formatMessage('Use <div> tags');
    expect(result).toContain('&lt;div&gt;');
  });

  describe('citations', () => {
    const citations = {
      '0': { id: '0', url: 'https://a.com', title: 'Source A', snippet: '' },
      '1': { id: '1', url: 'https://b.com', title: 'Source B', snippet: '' }
    };

    it('renders [1] style citations', () => {
      const result = formatMessage('Fact [1]', citations);
      expect(result).toContain('citation-link');
      expect(result).toContain('href="https://a.com"');
    });

    it('renders ^1^ style citations', () => {
      const result = formatMessage('Fact ^1^', citations);
      expect(result).toContain('citation-link');
    });

    it('renders [REF]0[/REF] style citations', () => {
      const result = formatMessage('Fact [REF]0[/REF]', citations);
      expect(result).toContain('citation-link');
    });

    it('marks missing citations', () => {
      const result = formatMessage('Fact [99]', citations);
      expect(result).toContain('citation-missing');
    });

    it('citation links open in new tab', () => {
      const result = formatMessage('Fact [1]', citations);
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });
  });

  describe('XSS prevention', () => {
    it('escapes <script> tags', () => {
      const result = formatMessage('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes event handler attributes', () => {
      const result = formatMessage('<img onerror="alert(1)" src=x>');
      // The entire tag is escaped — the opening < becomes &lt; so the browser
      // never parses it as an element, making the onerror harmless text.
      expect(result).not.toContain('<img');
      expect(result).toContain('&lt;img');
    });

    it('escapes <iframe> injection', () => {
      const result = formatMessage('<iframe src="https://evil.com"></iframe>');
      expect(result).not.toContain('<iframe');
      expect(result).toContain('&lt;iframe');
    });

    it('escapes nested HTML in bold/italic', () => {
      const result = formatMessage('**<script>alert(1)</script>**');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes HTML inside code blocks', () => {
      const result = formatMessage('```\n<script>alert("xss")</script>\n```');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes HTML inside inline code', () => {
      const result = formatMessage('Use `<script>alert(1)</script>` carefully');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('rejects javascript: links', () => {
      const result = formatMessage('[click](javascript:alert(1))');
      expect(result).not.toContain('href="javascript:');
    });

    it('escapes < and > in plain content', () => {
      const result = formatMessage('a < b > c');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });
  });

  describe('nested formatting', () => {
    it('renders bold inside italic', () => {
      const result = formatMessage('*this is **bold** inside italic*');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>');
    });
  });

  describe('multiple code blocks', () => {
    it('renders multiple code blocks in one message', () => {
      const input = '```js\nconst a = 1;\n```\n\nSome text\n\n```python\nx = 2\n```';
      const result = formatMessage(input);
      expect(result).toContain('language-js');
      expect(result).toContain('const a = 1;');
      expect(result).toContain('language-python');
      expect(result).toContain('x = 2');
      // Should have two code blocks
      const codeBlockCount = (result.match(/<pre class="md-codeblock">/g) || []).length;
      expect(codeBlockCount).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('handles empty string input', () => {
      const result = formatMessage('');
      expect(result).toBe('');
    });

    it('handles very long single-line content', () => {
      const longLine = 'A'.repeat(10000);
      const result = formatMessage(longLine);
      expect(result).toContain(longLine);
    });
  });

  describe('table alignment markers', () => {
    it('renders left-aligned columns with :---', () => {
      const input = '| Name | Age |\n| :--- | --- |\n| Alice | 30 |';
      const result = formatMessage(input);
      expect(result).toContain('<table class="md-table">');
      expect(result).toContain('text-align:left');
      expect(result).toContain('Alice');
    });

    it('renders center-aligned columns with :---:', () => {
      const input = '| Name | Age |\n| :---: | :---: |\n| Alice | 30 |';
      const result = formatMessage(input);
      expect(result).toContain('text-align:center');
    });

    it('renders right-aligned columns with ---:', () => {
      const input = '| Name | Age |\n| ---: | ---: |\n| Alice | 30 |';
      const result = formatMessage(input);
      expect(result).toContain('text-align:right');
    });

    it('renders mixed alignment', () => {
      const input = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |';
      const result = formatMessage(input);
      expect(result).toContain('text-align:left');
      expect(result).toContain('text-align:center');
      expect(result).toContain('text-align:right');
    });
  });
});
