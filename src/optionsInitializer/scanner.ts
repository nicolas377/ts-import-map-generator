export const enum ScannerNodeKind {
  Whitespace,
  Text,
}

interface ScannerNode {
  kind: ScannerNodeKind;
  text: string;
}

interface TextNode extends ScannerNode {
  kind: ScannerNodeKind.Text;
}

export interface TextNodeWithFlags extends TextNode {
  dashFlag: boolean;
  equalsFlag: boolean;
}

export interface WhitespaceNode extends ScannerNode {
  kind: ScannerNodeKind.Whitespace;
}

function createWhitespaceNode(text: string): WhitespaceNode {
  return {
    kind: ScannerNodeKind.Whitespace,
    text,
  };
}

function createTextNode(text: string): TextNode {
  return {
    kind: ScannerNodeKind.Text,
    text,
  };
}

function regexMatchesFullString(text: string, regex: RegExp): boolean {
  return regex.exec(text)?.[0] === text;
}

const whitespaceRegex = /\s+/;

// Scanner is a generator that yields raw text and whitespace nodes from the input.
export function* scanArgs(
  args: string
): Generator<WhitespaceNode | TextNodeWithFlags> {
  // The scanner is built around matching phrases and returning them as nodes.
  // When the scanner encounters a phrase, it yields a node, clears the current text, and then continues scanning from the end of the phrase.
  // There are two special characters, and text nodes:
  // - The dash character (-) is a flag that indicates the next text node should be treated as a flag.
  //   One dash indicates a short flag, and two dashes indicate a long flag.
  //   Short flags can be combined, e.g. -abc is equivalent to -a -b -c.
  //   Since short flags can be combined, they cannot have values attached to them.
  // - The equals character (=) is a flag that indicates the next text node should be treated as a value.
  //   Multiple equals characters are supported, and mean the same as one equal character.

  // TODO: support quotes around values

  const argsChars: readonly string[] = [...args];
  const flagDefaults = {
    dashFlag: false,
    equalsFlag: false,
  };

  let currentCharIndex = -1;
  let currentText = "";

  let isOutOfChars = false;

  // When this is true, we're out of characters to scan after this one, and should yield a node now and exit.
  let dashFlag: boolean = flagDefaults.dashFlag;
  let equalsFlag: boolean = flagDefaults.equalsFlag;

  // Actual implementation here.
  while (true) {
    const nodeOrFalse = createNodeFromCurrentText();

    if (nodeOrFalse === false) {
      if (isOutOfChars) {
        // We can't do anything else, so we have to just exit.
        break;
      } else {
        // The current text doesn't match any phrases, so we'll keep scanning.
        setupNextChar();
      }
    } else {
      // The current text matches a phrase, so we'll yield a node, cleanup this phrase, and then keep scanning.
      yield nodeOrFalse;

      if (isOutOfChars) {
        // We can't do anything else, so we have to just exit.
        break;
      } else {
        cleanupCurrentPhrase();
        setFlagDefaults();
      }
    }
  }

  // This is the main logic of the scanner.
  // It takes the current text, and tries to create a full phrase.
  // If it can't, it returns false.
  // If it can create a full phrase, it checks if the phrase is continued in the next character.
  // If it is, it returns false.
  // If it isn't, it returns a node for the phrase.
  function createNodeFromCurrentText():
    | WhitespaceNode
    | TextNodeWithFlags
    | false {
    if (currentText.length === 0) {
      // If there's no current text, we can't create a node.
      return false;
    }

    const attemptedNode = createNode();

    if (nodeCanBeExtended(attemptedNode)) return false;
    else return addFlagsToNode(attemptedNode);

    function createNode(): WhitespaceNode | TextNode {
      if (regexMatchesFullString(currentText, whitespaceRegex)) {
        return createWhitespaceNode(currentText);
      } else if (regexMatchesFullString(currentText, /^-+$/)) {
        // This is when we have a bunch of dashes, like "--".
        // We can generate a text node for this, and set the dash flag.
        dashFlag = true;
        return createTextNode(currentText);
      } else if (currentText === "=") {
        // Equal signs are separators between names and values.
        // We can generate a text node for them, and set the equals flag.
        equalsFlag = true;
        return createTextNode(currentText);
      } else {
        // After all this, we can create a text node for the current text.
        return createTextNode(currentText);
      }
    }

    // Looks at the next character, and checks if the current node can be extended to include it.
    function nodeCanBeExtended(node: WhitespaceNode | TextNode): boolean {
      const nextChar = viewNextChar();

      if (nextChar === undefined) {
        // If there's no next character, we can't extend the node.
        return false;
      }
      const nextCharIsWhitespace = regexMatchesFullString(
        nextChar,
        whitespaceRegex
      );

      if (node.kind === ScannerNodeKind.Whitespace) {
        return nextCharIsWhitespace;
      } else if (nextCharIsWhitespace) {
        // We have to be in a text node, and whitespace ends text nodes.
        return false;
      } else if (dashFlag) {
        // The next character can be part of the current node if it's a dash.
        return nextChar === "-";
      } else if (equalsFlag) {
        // There should be only one equals sign in a node.
        // However, we should still support the case where there are multiple equals signs in a row.
        return nextChar === "=";
      } else {
        // This is the case where we're in a non-flagged text node, and the next character isn't whitespace.
        // We can extend the node if the next character is a letter, number, dash, or underscore.
        return regexMatchesFullString(nextChar, /[a-zA-Z0-9_-]/);
      }
    }

    function addFlagsToNode(
      attemptedNode: WhitespaceNode | TextNode
    ): WhitespaceNode | TextNodeWithFlags {
      if (attemptedNode.kind === ScannerNodeKind.Whitespace) {
        // Whitespace nodes don't have flags.
        return attemptedNode;
      } else {
        return {
          ...attemptedNode,
          dashFlag,
          equalsFlag,
        };
      }
    }
  }

  function viewNextChar(): string | undefined {
    return argsChars[currentCharIndex + 1];
  }

  function setupNextChar(): void {
    if (isOutOfChars) return;

    const nextCharIndex = currentCharIndex + 1;

    // If this is the last character, set the isOutOfChars flag.
    if (nextCharIndex >= argsChars.length - 1) {
      isOutOfChars = true;
    }

    currentCharIndex = nextCharIndex;
    currentText += argsChars[currentCharIndex] ?? "";
  }

  // Called after a node is yielded, to reset flag values to their defaults before we start searching for the next phrase.
  function setFlagDefaults(): void {
    dashFlag = flagDefaults.dashFlag;
    equalsFlag = flagDefaults.equalsFlag;
  }

  function cleanupCurrentPhrase(): void {
    currentText = "";
  }
}
