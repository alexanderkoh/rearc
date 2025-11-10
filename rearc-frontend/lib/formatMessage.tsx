import React from "react";
import { ARC_EXPLORER_URL, USDC_ADDRESS, EURC_ADDRESS, REARC_ADDRESS, NYC1_ADDRESS } from "./constants";

// Token symbol to address mapping
const TOKEN_ADDRESSES: Record<string, string> = {
  USDC: USDC_ADDRESS,
  EURC: EURC_ADDRESS,
  REARC: REARC_ADDRESS,
  NYC1: NYC1_ADDRESS,
};

/**
 * Formats AI response text with:
 * - Clickable token names (links to contract addresses)
 * - Formatted balances (bold numbers)
 * - Better line breaks
 * - Readable lists
 * - Addresses only shown when explicitly mentioned (not in token name patterns)
 */
export function formatMessage(text: string): React.ReactNode {
  if (!text) return text;

  // Pattern to match Ethereum addresses (0x followed by 40 hex chars)
  const addressPattern = /0x[a-fA-F0-9]{40}/g;
  
  // Pattern to match balances like "12.673388 USDC" or "995072.639089388014913158 REARC"
  const balancePattern = /(\d+\.?\d*)\s+([A-Z]{2,10}(?:\s+LP)?)/g;

  // Pattern to match token name with address: "TOKEN_NAME (0x...)" or "TOKEN_NAME (address)"
  const tokenWithAddressPattern = /([A-Z]{2,10})\s*\((__ADDR_\d+__|0x[a-fA-F0-9]{40})\)/g;

  const replacements: Array<{ placeholder: string; element: React.ReactNode }> = [];
  let replacementIndex = 0;

  // Step 1: Replace addresses with placeholders first
  let processedText = text;
  const addressMatches: Array<{ address: string; index: number; placeholder: string }> = [];
  
  let addressMatch;
  while ((addressMatch = addressPattern.exec(text)) !== null) {
    const placeholder = `__ADDR_${replacementIndex}__`;
    addressMatches.push({
      address: addressMatch[0],
      index: addressMatch.index,
      placeholder,
    });
    processedText = processedText.replace(addressMatch[0], placeholder);
    replacementIndex++;
  }

  // Step 2: Replace token names with addresses (e.g., "USDC (__ADDR_0__)" -> just "USDC" as link)
  // Also handle standalone token symbols
  const tokenSymbols = Object.keys(TOKEN_ADDRESSES).filter(symbol => TOKEN_ADDRESSES[symbol]);
  
  // First, handle patterns like "TOKEN_NAME (__ADDR_X__)" - replace with just token name as link
  for (const symbol of tokenSymbols) {
    const address = TOKEN_ADDRESSES[symbol];
    if (!address) continue;
    
    // Find token name with address placeholder pattern
    const tokenWithAddrRegex = new RegExp(`\\b${symbol}\\s*\\((__ADDR_\\d+__)\\)`, 'gi');
    let match;
    while ((match = tokenWithAddrRegex.exec(processedText)) !== null) {
      const placeholder = `__TOKEN_${replacementIndex}__`;
      replacements.push({
        placeholder,
        element: (
          <a
            key={`token-${symbol}-${match.index}`}
            href={`${ARC_EXPLORER_URL}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--theme-focused-foreground)',
              textDecoration: 'underline',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {symbol}
          </a>
        ),
      });
      // Replace "TOKEN_NAME (__ADDR_X__)" with placeholder
      processedText = processedText.replace(match[0], placeholder);
      replacementIndex++;
    }
    
    // Also handle standalone token symbols (not in balance patterns, not already replaced)
    // Match token symbol that's not part of a balance and not already a link
    const standaloneTokenRegex = new RegExp(`\\b${symbol}\\b(?!\\s*LP|\\s*\\(|\\s*\\d)`, 'gi');
    let standaloneMatch;
    const standaloneMatches: Array<{ index: number; symbol: string }> = [];
    
    // Collect all matches first
    while ((standaloneMatch = standaloneTokenRegex.exec(processedText)) !== null) {
      // Check if this is already a placeholder or part of a balance
      const beforeContext = processedText.slice(Math.max(0, standaloneMatch.index - 20), standaloneMatch.index);
      const afterContext = processedText.slice(standaloneMatch.index + standaloneMatch[0].length, standaloneMatch.index + standaloneMatch[0].length + 20);
      
      // Skip if it's part of a number (balance) or already a placeholder
      if (!beforeContext.match(/\d$/) && !afterContext.match(/^\s*\d/) && !beforeContext.includes('__TOKEN_') && !beforeContext.includes('__BAL_')) {
        standaloneMatches.push({
          index: standaloneMatch.index,
          symbol: standaloneMatch[0],
        });
      }
    }
    
    // Replace in reverse order to maintain indices
    for (let i = standaloneMatches.length - 1; i >= 0; i--) {
      const match = standaloneMatches[i];
      const placeholder = `__TOKEN_${replacementIndex}__`;
      replacements.push({
        placeholder,
        element: (
          <a
            key={`token-standalone-${symbol}-${match.index}`}
            href={`${ARC_EXPLORER_URL}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--theme-focused-foreground)',
              textDecoration: 'underline',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {match.symbol}
          </a>
        ),
      });
      processedText = processedText.slice(0, match.index) + placeholder + processedText.slice(match.index + match.symbol.length);
      replacementIndex++;
    }
  }

  // Step 3: Replace remaining address placeholders with links (only if not part of token name pattern)
  for (const addrMatch of addressMatches) {
    // Check if this address placeholder is still in the text (wasn't removed as part of token name)
    if (processedText.includes(addrMatch.placeholder)) {
      const placeholder = `__ADDR_FINAL_${replacementIndex}__`;
      replacements.push({
        placeholder,
        element: (
          <a
            key={`addr-${addrMatch.index}`}
            href={`${ARC_EXPLORER_URL}/address/${addrMatch.address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--theme-focused-foreground)',
              textDecoration: 'underline',
              wordBreak: 'break-all',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {addrMatch.address}
          </a>
        ),
      });
      processedText = processedText.replace(addrMatch.placeholder, placeholder);
      replacementIndex++;
    }
  }

  // Step 4: Replace balances - format numbers and make token symbols clickable
  // Match balances from original text to get correct indices, then check processedText
  let balanceMatch;
  const balanceMatches: Array<{ match: RegExpMatchArray; symbol: string; amount: string }> = [];
  
  while ((balanceMatch = balancePattern.exec(text)) !== null) {
    // Check if this overlaps with an address in original text
    const overlaps = text.slice(balanceMatch.index, balanceMatch.index + balanceMatch[0].length).match(/0x[a-fA-F0-9]{40}/);
    if (!overlaps) {
      balanceMatches.push({
        match: balanceMatch,
        symbol: balanceMatch[2].trim(),
        amount: balanceMatch[1],
      });
    }
  }

  // Process balance matches - need to find them in processedText by searching for the pattern
  // Since token symbols might already be placeholders, we'll search for the number pattern
  for (const balanceInfo of balanceMatches) {
    const originalMatch = balanceInfo.match;
    const amount = parseFloat(balanceInfo.amount);
    const symbol = balanceInfo.symbol;
    const isLP = symbol.includes('LP');
    const baseSymbol = isLP ? symbol.replace(/\s+LP$/, '').trim() : symbol.trim();
    
    // Try to find this balance in processedText
    // Look for the amount followed by either the symbol or a placeholder
    const amountStr = amount.toString();
    const searchPattern = new RegExp(`\\b${amountStr.replace('.', '\\.')}\\s+(${symbol}|__TOKEN_\\d+__)`, 'i');
    const foundMatch = processedText.match(searchPattern);
    
    if (foundMatch) {
      const placeholder = `__BAL_${replacementIndex}__`;
      const matchIndex = processedText.indexOf(foundMatch[0]);
      
      // If the symbol is a known token, make it a link
      const tokenAddress = TOKEN_ADDRESSES[baseSymbol];
      let symbolElement: React.ReactNode = symbol;
      
      if (tokenAddress && !isLP) {
        symbolElement = (
          <a
            key={`bal-symbol-${baseSymbol}-${matchIndex}`}
            href={`${ARC_EXPLORER_URL}/address/${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--theme-focused-foreground)',
              textDecoration: 'underline',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {symbol}
          </a>
        );
      }
      
      replacements.push({
        placeholder,
        element: (
          <strong key={`bal-${matchIndex}`} style={{ color: 'var(--theme-text)' }}>
            {amount.toLocaleString('en-US', { maximumFractionDigits: 6, minimumFractionDigits: 2 })} {symbolElement}
          </strong>
        ),
      });
      processedText = processedText.slice(0, matchIndex) + placeholder + processedText.slice(matchIndex + foundMatch[0].length);
      replacementIndex++;
    }
  }

  // Step 5: Format the text with placeholders, then replace them
  const formattedStructure = formatTextWithBreaks(processedText, 0);
  
  // Step 6: Replace placeholders with actual elements
  return replacePlaceholders(formattedStructure, replacements);
}

/**
 * Recursively replaces placeholders in React nodes
 */
function replacePlaceholders(node: React.ReactNode, replacements: Array<{ placeholder: string; element: React.ReactNode }>): React.ReactNode {
  if (typeof node === 'string') {
    let result: React.ReactNode[] = [];
    let currentText = node;
    let keyIndex = 0;

    // Process all replacements in order
    const sortedReplacements = [...replacements].sort((a, b) => {
      const aIndex = currentText.indexOf(a.placeholder);
      const bIndex = currentText.indexOf(b.placeholder);
      return aIndex - bIndex;
    });

    for (const replacement of sortedReplacements) {
      const index = currentText.indexOf(replacement.placeholder);
      if (index !== -1) {
        // Add text before placeholder
        if (index > 0) {
          const beforeText = currentText.slice(0, index);
          if (beforeText) {
            result.push(<React.Fragment key={`text-${keyIndex++}`}>{beforeText}</React.Fragment>);
          }
        }
        // Add replacement element with key
        result.push(<React.Fragment key={`repl-${keyIndex++}`}>{replacement.element}</React.Fragment>);
        // Update text
        currentText = currentText.slice(index + replacement.placeholder.length);
      }
    }

    // Add remaining text
    if (currentText) {
      result.push(<React.Fragment key={`text-${keyIndex++}`}>{currentText}</React.Fragment>);
    }

    return result.length > 0 ? <>{result}</> : node;
  }

  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    const children = props.children;
    
    if (typeof children === 'string') {
      const replaced = replacePlaceholders(children, replacements);
      return React.cloneElement(node, {
        ...props,
        children: replaced,
      } as any);
    }
    
    if (Array.isArray(children)) {
      return React.cloneElement(node, {
        ...props,
        children: children.map((child: React.ReactNode, i: number) => (
          <React.Fragment key={i}>{replacePlaceholders(child, replacements)}</React.Fragment>
        )),
      } as any);
    }

    if (children) {
      return React.cloneElement(node, {
        ...props,
        children: replacePlaceholders(children, replacements),
      } as any);
    }
  }

  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={i}>{replacePlaceholders(child, replacements)}</React.Fragment>
    ));
  }

  return node;
}

/**
 * Formats text with proper line breaks and list formatting
 */
function formatTextWithBreaks(text: string, baseKey: number = 0): React.ReactNode {
  if (!text) return null;

  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  if (paragraphs.length === 0) return text;

  return (
    <>
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();
        const paraKey = `para-${baseKey}-${i}`;
        
        // Check if it's a list (starts with bullet)
        if (trimmed.match(/^[-•*]\s+/m)) {
          return (
            <div key={paraKey} style={{ marginBottom: '0.75rem' }}>
              {formatList(trimmed, paraKey)}
            </div>
          );
        }
        
        // Regular paragraph with line breaks
        const lines = trimmed.split(/\n/).filter(l => l.trim());
        return (
          <div key={paraKey} style={{ marginBottom: '0.75rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {lines.map((line, j) => (
              <React.Fragment key={`${paraKey}-line-${j}`}>
                {line.trim()}
                {j < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </>
  );
}

/**
 * Formats list items - handles multi-line items (like addresses)
 */
function formatList(text: string, baseKey: string): React.ReactNode {
  // Split by lines, but group lines that belong to the same list item
  const lines = text.split(/\n/).map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) return <>{text}</>;

  const items: string[] = [];
  let currentItem = '';

  for (const line of lines) {
    // Check if this line starts a new list item
    if (line.match(/^[-•*]\s+/)) {
      // Save previous item if exists
      if (currentItem) {
        items.push(currentItem);
      }
      // Start new item
      currentItem = line;
    } else if (currentItem) {
      // This line continues the current item (e.g., address on next line)
      currentItem += ' ' + line;
    } else {
      // Orphaned line, treat as new item
      currentItem = '• ' + line;
    }
  }
  
  // Add last item
  if (currentItem) {
    items.push(currentItem);
  }

  if (items.length === 0) return <>{text}</>;

  return (
    <div style={{ paddingLeft: '1.5rem' }}>
      {items.map((item, i) => {
        const content = item.replace(/^[-•*]\s+/, '').trim();
        return (
          <div key={`${baseKey}-item-${i}`} style={{ marginBottom: '0.5rem', lineHeight: '1.5' }}>
            <span style={{ marginRight: '0.5ch' }}>•</span>
            {content}
          </div>
        );
      })}
    </div>
  );
}

