import {
  TextNodeWithFlags as ParserTextNode,
  WhitespaceNode as ParserWhitespaceNode,
  scanArgs,
  ScannerNodeKind,
} from "./scanner";
import { Debug } from "utils";

const enum NodeKind {
  SyntaxTree,
  Separator,
  Argument,
  Flag,
  Value,
  EqualsSign,
  Dash,
  UnknownText,
}

const enum NodeFlags {
  None = 0,
  HasMoreThanTwoDashes = 1 << 1,
  HasMoreThanOneEquals = 1 << 2,
}

type NodeId = number & { unique: symbol };

type ExcludeParent<T extends Node> = Omit<T, "parent">;

interface ParentLessNode {
  readonly kind: NodeKind;
  readonly id: NodeId;
  flags: NodeFlags;
}

interface Node extends ParentLessNode {
  parent: ParentLessNode;
}

interface UnknownTextNode extends Node {
  readonly kind: NodeKind.UnknownText;
  readonly text: string;
}

interface SeparatorNode extends Node {
  readonly kind: NodeKind.Separator;
}

interface ValueNode extends Node {
  readonly kind: NodeKind.Value;
  readonly text: string;
}

interface FlagNode extends Node {
  readonly kind: NodeKind.Flag;
  readonly text: string;
}

interface DashNode extends Node {
  readonly kind: NodeKind.Dash;

  readonly singleDash: boolean;
  readonly doubleDash: boolean;
}

interface ArgumentNode extends Node {
  readonly kind: NodeKind.Argument;

  readonly dash: DashNode;
  readonly flag: FlagNode;
  separator?: SeparatorNode;
  value?: ValueNode;
}

interface SyntaxTree extends ParentLessNode {
  readonly kind: NodeKind.SyntaxTree;
  readonly arguments: ArgumentNode[];
}

interface SyntaxTreeApi {
  readonly syntaxTree: SyntaxTree;
  findNodeById(id: NodeId): ParentLessNode | undefined;
}

export function parseSyntaxTreeFromArgsString(
  argsString: string
): SyntaxTreeApi {
  // The parser is made to construct a syntax tree.
  // The syntax tree starts with a root node, and then has a series of argument nodes.
  // Each argument node has a dash node, a flag node, an equals sign node, and a value node.
  // The parser is built around parsing those nodes from the phrases yielded by the scanner, and creating the syntax tree from them.
  // There are a few special cases:
  // - If the current dash node has one dash, and the scanner yields an unflagged text node, the the text node should be treated with each individual character as a flag.
  //   This is because short flags can be combined, e.g. -abc is equivalent to -a -b -c.
  // - If the current dash node has one dash, a equals sign node and a value node should be ignored.
  //   This is because short flags cannot have values attached to them.

  // TODO: find some way to prune nodes that don't make it into the final syntax tree.
  const idNodeMap = new Map<NodeId, ParentLessNode>();
  const syntaxTree: SyntaxTree = Object.assign(
    createParentLessNode(NodeKind.SyntaxTree),
    { arguments: [] }
  );
  const scannedArgs = [...scanArgs(argsString)];

  let currentScannedArgIndex = -1;
  let currentScannedArg = scannedArgs[currentScannedArgIndex];
  let isOutOfScannedArgs = false;

  const flagDefaults = {
    singleDash: false,
    doubleDash: false,
    moreThanTwoDashes: false,
  };

  let singleDashFlag: boolean = flagDefaults.singleDash;
  let doubleDashFlag: boolean = flagDefaults.doubleDash;
  let moreThanTwoDashesFlag: boolean = flagDefaults.moreThanTwoDashes;

  let currentDashNode: ExcludeParent<DashNode> | undefined;
  let currentFlagNode: ExcludeParent<FlagNode> | undefined;
  let currentSeparatorNode: ExcludeParent<SeparatorNode> | undefined;
  let currentValueNode: ExcludeParent<ValueNode> | undefined;

  while (currentScannedArgIndex < scannedArgs.length) {
    if (currentScannedArg === undefined) {
      if (isOutOfScannedArgs) {
        // We're out of arguments, so we're done. This branch shouldn't ever be run (it should be covered later), but it's here for safety.
        break;
      }
      // This is the first iteration. We should just set up the first scanned arg and continue.
      setupNextScannedArg();
      continue;
    }

    // If we encounter whitespace or an equals sign, check if we're creating a long flag argument and the flag is already set.
    if (parserNodeIsSeparator(currentScannedArg)) {
      // We won't do anything else with a separator node, so we can just discard it if we don't do anything now.
      if (currentFlagNode) {
        if (isCurrentlyCreatingArgument() && doubleDashFlag) {
          // If we are, we should create and bind a separator node.
          currentSeparatorNode = createParentLessSeparatorNode();
        } else {
          // Otherwise, log a warning.
          Debug.warn("Unexpected whitespace or equals sign in argument.");
        }
      }
    }

    // If we encounter dashes, check if we are already creating an argument.
    else if (currentScannedArg.dashFlag) {
      if (isCurrentlyCreatingArgument()) {
        // If we are, ignore the dashes and log a warning.
        Debug.warn("Unexpected dashes in argument.");
      } else {
        // If we aren't, create and bind a dash node.
        singleDashFlag = currentScannedArg.text.length === 1;
        doubleDashFlag = currentScannedArg.text.length >= 2;
        moreThanTwoDashesFlag = currentScannedArg.text.length > 2;

        currentDashNode = createParentLessDashNode();
      }
    }

    // If the current dash node has one dash, then the text node should be treated with each individual character as a flag.
    else if (singleDashFlag) {
      for (const char of currentScannedArg.text) {
        currentDashNode = createParentLessDashNode();
        currentFlagNode = createParentLessFlagNode({ text: char });
        createAndBindArgumentNode();
      }

      continue;
    }

    // If we encounter an unflagged text node, create a UnknownTextNode.
    else {
      const unknownTextNode =
        createParentLessUnknownTextNode(currentScannedArg);

      // Narrow it to a FlagNode or a ValueNode (offloaded to another function), then bind it.
      const narrowedTextNodeOrFalse = narrowUnknownTextNode(unknownTextNode);

      if (narrowedTextNodeOrFalse === false) {
        // If we can't narrow the unknown text node, we should log a warning.
        Debug.warn("Unknown text node.");
      } else if (narrowedTextNodeOrFalse.kind === NodeKind.Flag) {
        // If we can narrow the unknown text node to a flag node, we should create and bind a flag node.
        currentFlagNode = narrowedTextNodeOrFalse;
      } else {
        // If we can narrow the unknown text node to a value node, we should create and bind a value node.
        currentValueNode = narrowedTextNodeOrFalse;
      }
    }

    // Check if everything that's needed for a argument node has been created.
    // If it has, then create the argument node, bind it to the syntax tree, and clean up for the next node.
    if (canNaturallyCreateArgumentNode()) {
      createAndBindArgumentNode();

      // If we're out of scanned args, we should exit the loop.
      // TODO: why is this narrowed to false?
      if (isOutOfScannedArgs) {
        break;
      }
    }

    // If there's no more left scanned nodes left, and we can't naturally make an argument node, then check if we can forcefully create one.
    // We need a dash node and a flag node to forcefully create a argument node.
    else if (isOutOfScannedArgs) {
      if (currentDashNode && currentFlagNode) {
        Debug.warn("Unexpected end of arguments.");
        createAndBindArgumentNode();
      }
      // If we can, do so, bind it to the syntax tree, and exit the loop.
      break;
    }

    // Otherwise, just keep going.
    setupNextScannedArg();
  }

  return createApi(syntaxTree);

  function createAndBindArgumentNode(): NodeId {
    const argumentNode = createArgumentNode(
      currentDashNode!,
      currentFlagNode!,
      currentSeparatorNode,
      currentValueNode
    );
    syntaxTree.arguments.push(argumentNode);
    resetForNewArgument();

    return argumentNode.id;
  }

  function canNaturallyCreateArgumentNode(): boolean {
    let canCreateArgument = false;

    // We need a dash node and a flag node no matter what.
    if (currentDashNode && currentFlagNode) {
      // If the dash node has two dashes, we can have a separator and value node, so check ahead to see if those are present.
      if (doubleDashFlag) {
        const forward2Args = peekForwardNArgs(2);

        // If two arguments forward is the start of a new argument, this argument ends now.
        // Note that we don't support --flag= --nextFlag, so we don't need to check for that.
        if (
          forward2Args &&
          forward2Args.kind === ScannerNodeKind.Text &&
          forward2Args.dashFlag
        ) {
          canCreateArgument = true;
        }
      }

      // If the dash node has one dash, we can't have a separator or value node, so we can create an argument node.
      else if (singleDashFlag) {
        canCreateArgument = true;
      }
    }

    return canCreateArgument;
  }

  function parserNodeIsSeparator(
    node: ParserTextNode | ParserWhitespaceNode
  ): node is ParserWhitespaceNode | (ParserTextNode & { equalsFlag: true }) {
    return node.kind === ScannerNodeKind.Whitespace || node.equalsFlag;
  }

  function isCurrentlyCreatingArgument(): boolean {
    return currentDashNode !== undefined;
  }

  function peekForwardNArgs(
    n: number
  ): ParserTextNode | ParserWhitespaceNode | undefined {
    return scannedArgs[currentScannedArgIndex + n];
  }

  function setupNextScannedArg(): void {
    if (isOutOfScannedArgs) return;

    const nextScannedArgIndex = currentScannedArgIndex + 1;

    // If the next scanned arg index is out of bounds, then we are out of scanned args after this one.
    if (nextScannedArgIndex >= scannedArgs.length - 1) {
      isOutOfScannedArgs = true;
    }

    currentScannedArgIndex = nextScannedArgIndex;
    currentScannedArg = scannedArgs[currentScannedArgIndex];
  }

  function resetForNewArgument(): void {
    currentDashNode = undefined;
    currentFlagNode = undefined;
    currentSeparatorNode = undefined;
    currentValueNode = undefined;

    singleDashFlag = flagDefaults.singleDash;
    doubleDashFlag = flagDefaults.doubleDash;
    moreThanTwoDashesFlag = flagDefaults.moreThanTwoDashes;
  }

  // Attempts to narrow the unknown text node to a flag node or a value node depending on the context.
  function narrowUnknownTextNode(
    unknownTextNode: ExcludeParent<UnknownTextNode>
  ): ExcludeParent<FlagNode> | ExcludeParent<ValueNode> | false {
    // If we're not currently creating an argument, then we can't narrow the unknown text node, so we log a warning and return false.
    if (!isCurrentlyCreatingArgument()) {
      Debug.warn("Unexpected text node between arguments.");
      return false;
    }

    const oneNodeForward = peekForwardNArgs(1);
    const twoNodesForward = peekForwardNArgs(2);

    // Narrowing based on context.

    // If the next token is a equals sign, then we should narrow the unknown text node to a flag node.
    if (
      oneNodeForward &&
      oneNodeForward.kind === ScannerNodeKind.Text &&
      oneNodeForward.equalsFlag
    ) {
      return createFlagNode();
    }
    // If two tokens forward is a dash node, or the previous node is a separator node, then we should narrow the unknown text node to a value node.
    const oneNodeBack = peekForwardNArgs(-1);
    if (
      (twoNodesForward &&
        twoNodesForward.kind === ScannerNodeKind.Text &&
        twoNodesForward.dashFlag) ||
      (oneNodeBack && parserNodeIsSeparator(oneNodeBack))
    ) {
      return createValueNode();
    }
    // If we need to fill a hole at currentFlagNode, then we should create a flag node.
    if (currentFlagNode === undefined) {
      return createFlagNode();
    }
    // If we need to fill a hole at currentValueNode, then we should create a value node.
    if (currentValueNode === undefined) {
      return createValueNode();
    }

    return false;

    function createFlagNode(): ExcludeParent<FlagNode> {
      return createParentLessFlagNode(unknownTextNode);
    }

    function createValueNode(): ExcludeParent<ValueNode> {
      return createParentLessValueNode(unknownTextNode);
    }
  }

  function createArgumentNode(
    dash: ExcludeParent<DashNode>,
    flag: ExcludeParent<FlagNode>,
    separator?: ExcludeParent<SeparatorNode>,
    value?: ExcludeParent<ValueNode>
  ): ArgumentNode {
    const argumentNode: ArgumentNode = Object.assign(
      createParentLessNode(NodeKind.Argument),
      {
        parent: syntaxTree,
        dash: dash as DashNode,
        flag: flag as FlagNode,
      }
    );

    Object.assign(dash, { parent: argumentNode });
    Object.assign(flag, { parent: argumentNode });

    if (value && separator) {
      argumentNode.separator = Object.assign(separator, {
        parent: argumentNode,
      });
      argumentNode.value = Object.assign(value, { parent: argumentNode });
    }

    return argumentNode;
  }

  function createParentLessDashNode(): ExcludeParent<DashNode> {
    return Object.assign(createParentLessNode(NodeKind.Dash), {
      flags: moreThanTwoDashesFlag
        ? NodeFlags.HasMoreThanTwoDashes
        : NodeFlags.None,
      singleDash: singleDashFlag,
      doubleDash: doubleDashFlag,
    });
  }

  function createParentLessSeparatorNode(): ExcludeParent<SeparatorNode> {
    return createParentLessNode(NodeKind.Separator);
  }

  function createParentLessUnknownTextNode({
    text,
  }: {
    text: string;
  }): ExcludeParent<UnknownTextNode> {
    return createTextNode(NodeKind.UnknownText, text);
  }

  function createParentLessValueNode({
    text,
  }: {
    text: string;
  }): ExcludeParent<ValueNode> {
    return createTextNode(NodeKind.Value, text);
  }

  function createParentLessFlagNode({
    text,
  }: {
    text: string;
  }): ExcludeParent<FlagNode> {
    return createTextNode(NodeKind.Flag, text);
  }

  function createTextNode<T extends NodeKind>(kind: T, text: string) {
    return Object.assign(createParentLessNode(kind), { text });
  }

  function createParentLessNode<T extends NodeKind>(kind: T) {
    const node = {
      kind,
      flags: NodeFlags.None,
      id: createNodeId(),
    };

    idNodeMap.set(node.id, node);

    return node;
  }

  function createApi(syntaxTree: SyntaxTree): SyntaxTreeApi {
    return {
      syntaxTree,
      findNodeById(id: NodeId): ParentLessNode | undefined {
        return idNodeMap.get(id);
      },
    };
  }

  function createNodeId(): NodeId {
    let i = 0 as NodeId;

    while (idNodeMap.has(i)) {
      i++;
    }

    return i;
  }
}
